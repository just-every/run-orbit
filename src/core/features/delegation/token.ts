import {z} from 'zod';
import {currentGrant,grantBindings,grantMatchPredicate,nativeFullPredicate} from './authority';
import {deny,hash,random} from './protocol';
const tokenSchema=z.object({grant_type:z.literal('authorization_code'),client_id:z.string(),redirect_uri:z.string(),code:z.string().regex(/^[a-f0-9]{64}$/),code_verifier:z.string().regex(/^[A-Za-z0-9._~-]{43,128}$/)}).strict();
export async function challenge(verifier:string){const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)));return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
export async function exchange(db:D1Database,body:unknown){
 const p=tokenSchema.safeParse(body);if(!p.success)deny(400,'INVALID_REQUEST');
 const input=p.data!,codeHash=await hash(input.code),proof=await challenge(input.code_verifier);
 const code=await db.prepare("SELECT * FROM delegation_codes WHERE hash=? AND consumed_at IS NULL AND expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')").bind(codeHash).first<{grant_id:string;challenge:string}>();
 if(!code||code.challenge!==proof)deny(401,'DELEGATION_INVALID');
 const g=await currentGrant(db,code!.grant_id),client=await db.prepare('SELECT redirect_uri FROM delegation_clients WHERE id=? AND enabled=1').bind(input.client_id).first<{redirect_uri:string}>();
 if(g.client_id!==input.client_id||client?.redirect_uri!==input.redirect_uri)deny(401,'DELEGATION_INVALID');
 const token=random(),tokenHash=await hash(token);
 const result=await db.batch([
  db.prepare(`UPDATE delegation_grants AS g SET token_hash=? WHERE g.id=? AND ${grantMatchPredicate} AND g.token_hash IS NULL AND g.revoked_at IS NULL AND g.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now') AND EXISTS(SELECT 1 FROM workspace_settings WHERE id=g.account_id) AND EXISTS(SELECT 1 FROM operators o WHERE o.id=g.principal_id AND ${nativeFullPredicate}) AND EXISTS(SELECT 1 FROM delegation_clients WHERE id=g.client_id AND enabled=1 AND redirect_uri=?) AND EXISTS(SELECT 1 FROM delegation_codes WHERE hash=? AND grant_id=g.id AND challenge=? AND consumed_at IS NULL AND expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')) AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import')`).bind(tokenHash,g.id,...grantBindings(g),input.redirect_uri,codeHash,proof),
  db.prepare("UPDATE delegation_codes SET consumed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE hash=? AND EXISTS(SELECT 1 FROM delegation_grants WHERE id=? AND token_hash=?)").bind(codeHash,g.id,tokenHash),
 ]);
 if(!result[0]!.meta.changes)deny(401,'DELEGATION_INVALID');
 await currentGrant(db,g.id,{...g,token_hash:tokenHash});
 return {access_token:token,token_type:'Bearer',expires_in:Math.max(0,Math.floor((Date.parse(g.expires_at)-Date.now())/1000)),scope:JSON.parse(g.scopes_json).join(' ')};
}
