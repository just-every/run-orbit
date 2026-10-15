import {AuthError,securityHeaders} from '@runeditrun/rer/modules/operator-auth';
import {requireOrigin,requirePost} from '@runeditrun/rer/internal/modules/operator-auth/http.mjs';
import {readInput} from '@runeditrun/rer/internal/modules/operator-auth/input.mjs';
import {confirmationResponse} from '@runeditrun/rer/internal/modules/operator-auth/identity/email-link/confirmation.mjs';
import {OWNER_SIGNIN_SECONDS,ownerSigninDigest} from '@runeditrun/rer/internal/modules/operator-auth/owner-signin-grant.mjs';
import {guard,ownerFence,version} from './store';
import {publicRateLimit} from '../../platform/public-rate-limit';
import type {OrbitIdentity} from './auth';

const validToken=(token:unknown):token is string=>typeof token==='string'&&/^[A-Za-z0-9_-]{43}$/.test(token);

/** Consume a CLI-minted grant against Orbit's native owner; opening the link signs nobody in. */
export async function ownerSigninResponse(request:Request,identity:OrbitIdentity):Promise<Response> {
 const {config,clock,store}=identity,db=store.db,url=new URL(request.url),now=clock();
 requireOrigin(request,config);
 const limited=await publicRateLimit(db,request,now);if(limited)return limited;
 async function grant(token:unknown) {
  if(!validToken(token))return null;
  return db.prepare(`SELECT g.id,g.operator_id,g.expires_at FROM identity_owner_signins g JOIN operators o ON o.id=g.operator_id
   WHERE g.token_hash=? AND g.consumed_at IS NULL AND g.expires_at>? AND g.expires_at<=? AND g.operator_version=${version('o')} AND o.setup_owner=1 AND o.status='active'`)
   .bind(await ownerSigninDigest(token),now,now+OWNER_SIGNIN_SECONDS*1000).first<{id:string;operator_id:string;expires_at:number}>();
 }
 if(['GET','HEAD'].includes(request.method)) {
  const token=url.searchParams.get('token'),unique=[...url.searchParams.keys()].every(key=>key==='token')&&url.searchParams.getAll('token').length===1;
  const found=unique?await grant(token):null;
  return confirmationResponse({branding:identity.auth.presentation,preview:found?{kind:'owner',expiresInMinutes:Math.max(1,Math.ceil((found.expires_at-now)/60_000))}:null,token,method:request.method,action:'/auth/owner-signin'});
 }
 requirePost(request,config);
 if(url.search||url.hash)throw new AuthError('invalid_input',400);
 const input=await readInput(request);
 if(Object.keys(input).some(key=>key!=='token')||!validToken(input.token))throw new AuthError('invalid_input',400);
 const found=await grant(input.token);
 if(!found)throw new AuthError('invalid_or_expired',400);
 const person=await store.person("o.id=? AND o.setup_owner=1 AND o.status='active'",found.operator_id);
 if(!person)throw new AuthError('invalid_or_expired',400);
 const result=await store.issue({person,kind:'native',now,returnTo:'/app/settings',freshProof:true,statements:[
  guard(db,ownerFence({operator:person})),
  db.prepare('UPDATE identity_owner_signins SET consumed_at=? WHERE id=? AND consumed_at IS NULL AND operator_id=? AND operator_version=? AND expires_at>? AND expires_at<=?')
   .bind(now,found.id,person.id,person.version,now,now+OWNER_SIGNIN_SECONDS*1000),
  guard(db,{sql:'changes()=1',args:[]}),
  db.prepare("INSERT INTO identity_audit(action,operator_id,value,created_at) VALUES('owner:signin-link',?,?,?)").bind(person.id,found.id,now),
 ]});
 if(!result)throw new AuthError('invalid_or_expired',400);
 return new Response(null,{status:303,headers:{...securityHeaders(),'Set-Cookie':result.cookie,Location:result.returnTo}});
}
