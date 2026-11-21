// @ts-expect-error Base's HTML page helper is plain ESM.
import {pageResponse} from '@runeditrun/rer/internal/modules/operator-auth/page.mjs';
// @ts-expect-error Base's one-click chooser is plain ESM.
import {oneClickPage} from '@runeditrun/rer/internal/modules/operator-auth/signin/one-click.mjs';
import {devNotFound,safeReturnTo,type devGate} from '@runeditrun/rer/modules/operator-auth';
import {sessionStore} from '../core/features/identity/store';
import {scopedSessionResponse} from './scoped-session';
import {identityConfig} from '../core/features/identity/auth';
import type {PlatformBindings} from '../core/platform/assets';
const escape=(value:string)=>value.replace(/[&<>"']/g,character=>`&#${character.charCodeAt(0)};`);
type Gate=NonNullable<ReturnType<typeof devGate>>;
export interface LocalPerson {as:string;email:string;displayName?:string}

/** Public entry stays on the sign-in page; only a valid checkout link unlocks local identities. */
export async function localSignIn(request:Request,env:PlatformBindings,gate:Gate,people:()=>Promise<LocalPerson[]>){
 const url=new URL(request.url),returnTo=safeReturnTo(url.searchParams.get('returnTo')),branding=identityConfig(env)!.branding;
 const destination=new URL(returnTo,url.origin);
 if(destination.pathname==='/app/access' && destination.searchParams.has('invitation'))return new Response(null,{status:303,headers:{location:returnTo,'cache-control':'no-store','referrer-policy':'no-referrer'}});
 const teammate=url.searchParams.get('teammate');
 if(teammate){
  if(url.origin!==env.AUTH_ORIGIN||!await gate.admits(request))return pageResponse({branding,heading:'Sign in on this computer',method:request.method,content:'<p>Ask the person running Orbit to open this address in their unlocked Orbit browser on this computer.</p>'});
  const store=sessionStore(env.DB,{devAdmitted:r=>gate.admits(r)});
  const person=await store.person("lower(o.email)=lower(?) AND o.status='active' AND o.setup_owner=0 AND NOT EXISTS(SELECT 1 FROM access_collaborators c WHERE c.operator_id=o.id)",teammate);
  if(!person)return devNotFound();
  if(request.method==='POST'){
   if(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')return devNotFound();
   const result=await store.issue({person,kind:'dev',now:Date.now()});
   return result?scopedSessionResponse(url.origin,gate,result.cookie,'/app'):devNotFound();
  }
  return pageResponse({branding,referrer:'strict-origin',heading:'Sign in on this computer',method:request.method,content:`<p>Switch this browser to <strong>${escape(person.email)}</strong> to give your teammate their local workspace.</p><form method="post" action="${escape(url.pathname+url.search)}"><button>Sign in as ${escape(person.displayName)}</button></form>`});
 }
 if(request.method==='POST'){
  if(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')return devNotFound();
  const form=await request.formData(),raw=form.get('link');
  let link:URL|undefined;try{if(typeof raw==='string'&&raw.length<=4096)link=new URL(raw);}catch{}
  const key=link&&link.origin===url.origin&&link.pathname==='/__dev/key'?new URLSearchParams(link.hash.slice(1)).get('rer-dev'):null;
  if(key&&await gate.admits(new Request(request.url,{headers:{'x-rer-dev-key':key}})))return new Response(null,{status:303,headers:{'cache-control':'no-store','referrer-policy':'no-referrer','set-cookie':await gate.setCookie(),location:url.pathname+url.search}});
  url.searchParams.set('notice','invalid_link');
 }
 if(await gate.admits(request))return oneClickPage({branding,method:request.method,returnTo,people:(await people()).map(person=>({...person,href:'/auth/dev/enter?'+new URLSearchParams({as:person.as,returnTo})}))});
 return pageResponse({branding,referrer:'strict-origin',heading:'Sign in to Orbit',method:request.method,status:request.method==='POST'?400:200,content:`<p>Open the private local access link that <code>rer dev</code> printed, or paste it here to choose a persona.</p><p>This link works only on this computer.</p>${url.searchParams.get('notice')==='invalid_link'?'<p role="alert">That link cannot open this Orbit. Ask for its current local access link.</p>':''}<form method="post" action="${escape(url.pathname+url.search)}"><label for="local-access-link">Local access link</label><input id="local-access-link" name="link" type="password" required autocomplete="off"><button>Choose a persona</button></form><p class="secondary-link"><a href="/">Home</a></p>`});
}
