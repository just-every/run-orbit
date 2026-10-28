import {tokenRefusal} from './token-errors';
import {boundedResponse,objectResponse} from './response';
import {CaptureError,CaptureProviderError} from '../contracts';
export type Provider='google'|'microsoft';
export type ProviderFetch=(input:string,init?:RequestInit)=>Promise<Response>;
// Workers supports manual redirects. Refuse the redirect before any second request.
export const providerNetworkFetch:ProviderFetch=async(input,init)=>{
 const response=await fetch(input,{...init,redirect:'manual'});
 if(response.status>=300&&response.status<400){await response.body?.cancel();throw new CaptureProviderError('unavailable','The provider returned a redirect. No further request was made.');}
 return response;
};
export const scopes={google:['https://www.googleapis.com/auth/gmail.readonly','https://www.googleapis.com/auth/calendar.readonly'],microsoft:['Mail.Read','Calendars.Read']};
export function providerId(value:string):Provider{if(value!=='google'&&value!=='microsoft')throw new CaptureError(404,'Unknown capture provider.');return value;}
export function tenantId(value:unknown){if(typeof value!=='string'||!/^([a-zA-Z0-9][a-zA-Z0-9.-]{0,200})$/.test(value))throw new CaptureError(400,'Enter a valid Microsoft tenant ID or domain.');return value;}
export function tokenEndpoint(provider:Provider,tenant='common'){return provider==='google'?'https://oauth2.googleapis.com/token':`https://login.microsoftonline.com/${tenantId(tenant)}/oauth2/v2.0/token`;}
export function redirectUri(origin:string,provider:Provider){return `${origin}/api/v1/capture/oauth/${provider}/callback`;}
export function trustedOrigin(origin:string|undefined,request?:string){
 if(!origin)throw new CaptureError(503,'Configure the installation AUTH_ORIGIN before connecting a provider.');
 const url=new URL(origin);
 if(url.origin!==origin||url.username||url.password||!(url.protocol==='https:'||(url.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(url.hostname))))throw new CaptureError(503,'Configure a trusted installation origin.');
 if(request&&new URL(request).origin!==origin)throw new CaptureError(403,'The provider connection must use the installation origin.');
 return origin;
}
export const writeScopes={google:'https://www.googleapis.com/auth/calendar.events',microsoft:'Calendars.ReadWrite'};
export interface Credential{writebackConsent?:boolean;clientId:string;clientSecret:string;tenant:string;accessToken:string;refreshToken:string;expiresAt:number;scope:string}
export function checkedScopes(provider:Provider,value:unknown){
 if(typeof value!=='string'||!scopes[provider].every(scope=>value.split(/\s+/).some(granted=>granted===scope||(provider==='microsoft'&&granted===`https://graph.microsoft.com/${scope}`))))throw new CaptureProviderError('revoked','The required read permissions were not granted.');
 return value;
}
export async function tokenRequest(fetcher:ProviderFetch,provider:Provider,tenant:string,form:URLSearchParams){
 let response:Response;try{response=await fetcher(tokenEndpoint(provider,tenant),{method:'POST',redirect:'error',headers:{'content-type':'application/x-www-form-urlencoded'},body:form,signal:AbortSignal.timeout(20000)});}catch{throw new CaptureProviderError('unavailable','The authorization server could not be reached.');}
 const value=await objectResponse(await boundedResponse(response,65536));
 if(!response.ok)throw tokenRefusal(provider,response.status,value.error);
 if(!value||typeof value.access_token!=='string'||!value.access_token||typeof value.expires_in!=='number'||!Number.isFinite(value.expires_in)||value.expires_in<=0||value.token_type!==undefined&&String(value.token_type).toLowerCase()!=='bearer'||value.refresh_token!==undefined&&(typeof value.refresh_token!=='string'||!value.refresh_token))throw new CaptureProviderError('unavailable','The authorization response was incomplete.');
 return value as Record<string,unknown>&{access_token:string;expires_in:number};
}
export function graphLink(value:string,path:string){
 let url:URL,actual:string[],expected:string[];
 try{
  // Inspect the original path before URL parsing can normalize dot segments or backslashes.
  const raw=/^https:\/\/([^/?#]+)(\/[^?#]*)(?:\?[^#]*)?$/i.exec(value);
  if(!raw||/[\x00-\x20\\]/.test(value)||raw[1]!.includes('@'))throw new Error();
  url=new URL(value);actual=graphSegments(raw[2]!);expected=graphSegments(path);
 }catch{throw new CaptureProviderError('unavailable','The provider returned an invalid continuation.');}
 if(url.origin!=='https://graph.microsoft.com'||url.username||url.password||url.hash||actual.length!==expected.length||actual.some((part,index)=>part!==expected[index]))throw new CaptureProviderError('unavailable','The provider returned an unsafe continuation.');
 return value;
}
function graphSegments(path:string){
 // Decode each segment separately: an encoded slash inside an ID is not a path separator.
 const parts=path.split('/').map(part=>decodeURIComponent(part));
 if(parts[0]!==''||parts[1]!=='v1.0'||parts[2]?.toLowerCase()!=='me')throw new Error();
 // Graph's documented links use mailfolders('id'); only these known collections have keys.
 // OData string keys double embedded quotes. Static names ignore case; IDs never do.
 const collection=/^(mailfolders|calendars)(?:\('((?:[^']|'')+)'\))?$/i.exec(parts[3]??'');
 if(!collection)throw new Error();
 const name=collection[1]!.toLowerCase(),prefix=['','v1.0','me',name];
 if(collection[2]===undefined&&parts.length===4)return prefix;
 const id=collection[2]===undefined?parts[4]:collection[2].replaceAll("''","'");
 const tail=parts.slice(collection[2]===undefined?5:4).map(part=>part.toLowerCase());
 if(!id||id==='.'||id==='..')throw new Error();
 if(name==='mailfolders'&&tail.length===1&&tail[0]==='childfolders')return [...prefix,id,...tail];
 if(tail.length!==2||tail[0]!==(name==='mailfolders'?'messages':'calendarview')||!/^(?:microsoft\.graph\.)?delta(?:\(\))?$/.test(tail[1]!))throw new Error();
 return [...prefix,id,tail[0],'delta'];
}
export const encodeId=(id:string)=>encodeURIComponent(id);
