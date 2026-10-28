import type {ProviderFetch} from '../capture/providers/config';
import {MailchimpError} from './contracts';
import {md5} from './md5';
/** A definite refusal carries Mailchimp's HTTP status; status 0 means no answer, so the outcome is unknown. */
export class MailchimpProviderError extends Error {
 constructor(public status:number,public title:string){super(title);}
 get refused(){return this.status>=400&&this.status<500;}
}
export function dataCenter(key:string){const match=/^[A-Za-z0-9-]{8,96}-(us[0-9]{1,3})$/.exec(key.trim());if(!match)throw new MailchimpError(400,'Enter a Mailchimp API key. It ends with your account’s data centre, such as -us1.');return match[1]!;}
export const subscriberHash=(email:string)=>md5(email.trim().toLowerCase());
export const audienceLink=(dc:string,webId:number)=>`https://${dc}.admin.mailchimp.com/lists/members?id=${webId}`;
/** Only fixed Mailchimp Marketing API paths. Neither the key nor a provider body is logged or returned. */
export async function mailchimpCall<T=any>(key:string,method:'GET'|'PUT'|'PATCH'|'POST',path:string,body?:unknown,fetcher:ProviderFetch=fetch):Promise<T>{
 let response:Response;
 try{response=await fetcher(`https://${dataCenter(key)}.api.mailchimp.com/3.0${path}`,{method,redirect:'manual',headers:{Authorization:'Basic '+btoa('orbit:'+key.trim()),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(12000)});}
 catch(error){if(error instanceof MailchimpError)throw error;throw new MailchimpProviderError(0,'unreachable');}
 let value:any=null;
 try{const raw=await response.text();if(raw.length>4*1024*1024)throw Error();value=raw?JSON.parse(raw):null;}catch{if(response.ok)throw new MailchimpProviderError(0,'unreadable');}
 if(!response.ok)throw new MailchimpProviderError(response.status,typeof value?.title==='string'?value.title.slice(0,120):`HTTP ${response.status}`);
 return value as T;
}
/** What to change, in plain words; a refusal never invites repeating a request that cannot succeed. */
export function refusalMessage(error:MailchimpProviderError){
 if(error.status===401)return 'Mailchimp refused the API key. Create a new key in Mailchimp (Profile, Extras, API keys) and connect again.';
 if(error.status===403)return 'Mailchimp refused this account’s access. Check the account in Mailchimp, then connect again.';
 if(error.status===404)return 'Mailchimp no longer has the chosen audience. Choose an audience again.';
 if(error.status===429)return 'Mailchimp is limiting requests from this account. Wait a minute before checking again.';
 return error.refused?'Mailchimp refused the request. Check the audience settings in Mailchimp.':'Mailchimp did not answer. Nothing was changed in Orbit; check the connection again in a few minutes.';
}
