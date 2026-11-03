// @ts-expect-error Base's HTML page helper is plain ESM.
import {pageResponse} from '@runeditrun/rer/internal/modules/operator-auth/page.mjs';
// @ts-expect-error Base's one-click chooser is plain ESM.
import {oneClickPage} from '@runeditrun/rer/internal/modules/operator-auth/signin/one-click.mjs';
import {devNotFound,safeReturnTo,type devGate} from '@runeditrun/rer/modules/operator-auth';
import {identityConfig} from '../core/features/identity/auth';
import type {PlatformBindings} from '../core/platform/assets';
const escape=(value:string)=>value.replace(/[&<>"']/g,character=>`&#${character.charCodeAt(0)};`);
type Gate=NonNullable<ReturnType<typeof devGate>>;
export interface LocalPerson {as:string;email:string;displayName?:string}

/** Public entry stays on the sign-in page; only a valid checkout link unlocks local identities. */
export async function localSignIn(request:Request,env:PlatformBindings,gate:Gate,people:()=>Promise<LocalPerson[]>){
 const url=new URL(request.url),returnTo=safeReturnTo(url.searchParams.get('returnTo')),branding=identityConfig(env)!.branding;
 if(request.method==='POST'){
  if(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')return devNotFound();
  const form=await request.formData(),raw=form.get('link');
  let link:URL|undefined;try{if(typeof raw==='string'&&raw.length<=4096)link=new URL(raw);}catch{}
  const key=link&&link.origin===url.origin&&link.pathname==='/__dev/key'?new URLSearchParams(link.hash.slice(1)).get('rer-dev'):null;
  if(key&&await gate.admits(new Request(request.url,{headers:{'x-rer-dev-key':key}})))return new Response(null,{status:303,headers:{'cache-control':'no-store','referrer-policy':'no-referrer','set-cookie':await gate.setCookie(),location:url.pathname+url.search}});
  url.searchParams.set('notice','invalid_link');
 }
 if(await gate.admits(request))return oneClickPage({branding,method:request.method,returnTo,people:(await people()).map(person=>({...person,href:'/auth/dev/enter?'+new URLSearchParams({as:person.as,returnTo})}))});
 const hint=url.searchParams.get('login_hint');
 return pageResponse({branding,referrer:'strict-origin',heading:'Sign in to Orbit',method:request.method,status:request.method==='POST'?400:200,content:`${hint?`<p>Sign in with <strong>${escape(hint)}</strong> to continue to your invitation.</p>`:''}<p>Open the local access link provided by the person running Orbit to choose a persona, or paste it here. This link works only on this computer.</p>${url.searchParams.get('notice')==='invalid_link'?'<p role="alert">That link cannot open this Orbit. Ask for its current local access link.</p>':''}<form method="post" action="${escape(url.pathname+url.search)}"><label for="local-access-link">Local access link</label><input id="local-access-link" name="link" type="password" required autocomplete="off"><button>Choose a persona</button></form><p class="secondary-link"><a href="/">Home</a></p>`});
}
