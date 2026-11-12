import {SupportError,type Credentials,type SupportConfig} from './contracts';
/** Zendesk API token authentication: https://developer.zendesk.com/api-reference/introduction/security-and-auth/ */
export class ZendeskFailure extends Error {constructor(readonly status:number){super('Zendesk request unavailable.');}}
export async function zendesk<T>(config:SupportConfig,subdomain:string,credentials:Credentials,path:string,body?:unknown):Promise<T>{
 if(!/^[a-z0-9][a-z0-9-]{0,62}$/.test(subdomain)||!path.startsWith('/api/v2/'))throw new SupportError(400,'Choose a Zendesk account and API resource.');
 let response:Response;
 try{response=await(config.fetcher??fetch)(`https://${subdomain}.zendesk.com${path}`,{method:body===undefined?'GET':'POST',headers:{Authorization:`Basic ${btoa(`${credentials.email}/token:${credentials.token}`)}`,Accept:'application/json',...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),redirect:'manual',signal:AbortSignal.timeout(15000)});}catch{throw new ZendeskFailure(0);}
 if(!response.ok)throw new ZendeskFailure(response.status);
 try{return await response.json() as T;}catch{throw new ZendeskFailure(0);}
}
/** Zendesk signs timestamp + exact body, with a base64 HMAC-SHA256 (no separator).
 * https://developer.zendesk.com/documentation/webhooks/verifying/ */
export async function verifyWebhook(secret:string,timestamp:string,raw:string,signature:string,clock:Date){
 const instant=Date.parse(timestamp);
 if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(timestamp)||!Number.isFinite(instant)||Math.abs(clock.getTime()-instant)>300000||!/^[A-Za-z0-9+/]{43}=$/.test(signature))return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 return crypto.subtle.verify('HMAC',key,Uint8Array.from(atob(signature),c=>c.charCodeAt(0)),new TextEncoder().encode(timestamp+raw));
}
