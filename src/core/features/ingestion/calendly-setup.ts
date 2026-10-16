import {z} from 'zod';
import {IngestionError} from './contracts';

const reference=(kind:string)=>z.string().regex(new RegExp(`^https://api\\.calendly\\.com/${kind}/[A-Za-z0-9_-]+$`));
const user=z.object({resource:z.object({uri:reference('users'),current_organization:reference('organizations')})});
const subscription=z.object({uri:reference('webhook_subscriptions'),callback_url:z.url(),state:z.string()});
const subscriptions=z.object({collection:z.array(subscription),pagination:z.object({next_page_token:z.string().nullable().optional()}).optional()});
const created=z.object({resource:subscription});

/** Credentials stay in this request; only Calendly's fixed API receives them. */
export async function connectCalendly(token:string,url:string,secret:string){
 async function request(path:string,init:RequestInit={}){
  let response:Response;
  try{response=await fetch(`https://api.calendly.com${path}`,{...init,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},redirect:'error',signal:AbortSignal.timeout(15000)});}
  catch{throw new IngestionError(503,'Calendly did not confirm the request. Check API & Webhooks in Calendly before trying again.');}
  if(!response.ok){
   await response.body?.cancel();
   if(response.status===401)throw new IngestionError(400,'Calendly refused this token. Generate a new personal access token and paste it again.');
   if(response.status===403)throw new IngestionError(400,'Calendly refused webhook access. Check your paid plan and token permissions: users:read, webhooks:read, webhooks:write and scheduled_events:read.');
   throw new IngestionError(503,`Calendly returned ${response.status}; setup was not confirmed. Check your API & Webhooks settings before trying again.`);
  }
  if(response.status===204)return null;
  try{return await response.json();}catch{throw new IngestionError(503,'Calendly returned an unreadable response; setup was not confirmed.');}
 }
 const account=user.safeParse(await request('/users/me'));
 if(!account.success)throw new IngestionError(503,'Calendly did not return your user and organization. Setup was not confirmed.');
 const query=new URLSearchParams({organization:account.data.resource.current_organization,user:account.data.resource.uri,scope:'user',count:'100'});
 // Find all pages before changing anything. Replace only this user's exact Orbit callback.
 const previous:z.infer<typeof subscription>[]=[];
 for(let page=0;;page++){
  if(page===10)throw new IngestionError(400,'This Calendly account has too many webhook subscriptions to replace safely. Remove unused subscriptions first.');
  const listed=subscriptions.safeParse(await request(`/webhook_subscriptions?${query}`));
  if(!listed.success)throw new IngestionError(503,'Calendly did not return its subscriptions. Setup was not confirmed.');
  previous.push(...listed.data.collection.filter(item=>item.callback_url===url));
  const next=listed.data.pagination?.next_page_token;if(!next)break;query.set('page_token',next);
 }
 for(const item of previous)await request(new URL(item.uri).pathname,{method:'DELETE'});
 const result=created.safeParse(await request('/webhook_subscriptions',{method:'POST',body:JSON.stringify({url,events:['invitee.created','invitee.canceled'],organization:account.data.resource.current_organization,user:account.data.resource.uri,scope:'user',signing_key:secret})}));
 if(!result.success||result.data.resource.state!=='active'||result.data.resource.callback_url!==url)throw new IngestionError(503,'Calendly did not confirm an active webhook at this address. Check API & Webhooks before trying again.');
 return {connected:true};
}
