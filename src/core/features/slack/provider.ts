import {SlackError} from './contracts';
const revoked=new Set(['invalid_auth','account_inactive','token_revoked']);
const known=new Set([...revoked,'missing_scope','not_in_channel','channel_not_found','is_archived','restricted_action','ratelimited','message_not_found','invalid_arguments','no_permission','cant_delete_message','is_frozen','channel_is_frozen','channel_is_archived']);
export class SlackProviderError extends Error {
 constructor(public code:string,public uncertain=false,public retryAfter:number|null=null){super(code);}
 get revoked(){return revoked.has(this.code);}
}
/** Only fixed Slack endpoints. Neither provider bodies nor credentials are logged or returned. */
export async function slackCall(token:string,method:string,body:Record<string,unknown>={},fetcher:typeof fetch=fetch){
 const mutating=method==='chat.postMessage'||method==='chat.delete';
 const read=method==='auth.test'||method==='users.info'||method.startsWith('conversations.')&&method!=='conversations.open',query=new URLSearchParams(Object.entries(body).map(([key,value])=>[key,String(value)]));
 let response:Response;
 try{response=await fetcher('https://slack.com/api/'+method+(read&&query.size?'?'+query:''),{method:read?'GET':'POST',redirect:'manual',headers:{Authorization:'Bearer '+token,...(read?{}:{'Content-Type':'application/json; charset=utf-8'})},...(read?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(12000)});}
 catch{throw new SlackProviderError(mutating?'submission_uncertain':'provider_unreachable',mutating);}
 if(response.status===429){const raw=response.headers.get('retry-after'),seconds=raw&&/^\d+$/.test(raw)?Math.max(1,Number(raw)):60;throw new SlackProviderError('ratelimited',false,seconds);}
 let value:any;
 try{const raw=await response.text();if(raw.length>2*1024*1024)throw Error();value=JSON.parse(raw);}catch{throw new SlackProviderError('unaccepted_response',mutating);}
 if(!response.ok)throw new SlackProviderError('http_'+response.status,mutating&&response.status>=500);
 if(value?.ok!==true)throw new SlackProviderError(known.has(value?.error)?value.error:'unaccepted_response',mutating&&!known.has(value?.error));
 return value;
}
export function internalChannel(channel:any,team:string){
 return Boolean(channel&&channel.is_member===true&&channel.is_archived===false&&(channel.is_frozen===false||!Object.hasOwn(channel,'is_frozen'))&&channel.is_channel===true&&channel.is_shared===false&&channel.is_ext_shared===false&&channel.is_org_shared===false&&channel.is_pending_ext_shared===false&&!channel.connected_team_ids?.length&&!channel.pending_connected_team_ids?.length&&!channel.pending_shared?.length&&!channel.shared_team_ids?.some((id:string)=>id!==team)&&channel.context_team_id===team&&!channel.is_im&&!channel.is_mpim);
}
export async function checkedChannel(token:string,id:string,team:string,fetcher?:typeof fetch){const {channel}=await slackCall(token,'conversations.info',{channel:id},fetcher);if(!internalChannel(channel,team))throw new SlackError(400,'Choose a workspace-internal channel where this bot is a member. Shared, external and archived channels are refused.');return channel as {id:string;name:string};}

/** Personal destinations must be active, full members of the installed workspace. */
export async function checkedPersonalUser(token:string,user:string,team:string,fetcher?:typeof fetch){
 const result=await slackCall(token,'users.info',{user},fetcher),person=result.user;
 if(!person||person.id!==user||person.team_id!==team||person.deleted!==false||person.is_bot!==false||person.is_app_user!==false||person.is_restricted!==false||person.is_ultra_restricted!==false||person.is_stranger===true)throw new SlackProviderError('unsafe_personal_identity');
}
export async function checkedPersonalDm(token:string,channel:string,user:string,fetcher?:typeof fetch){
 const result=await slackCall(token,'conversations.info',{channel},fetcher),dm=result.channel;
 if(!dm||dm.id!==channel||dm.is_im!==true||dm.user!==user||dm.is_user_deleted!==false||dm.is_mpim===true||dm.is_shared===true||dm.is_ext_shared===true)throw new SlackProviderError('unsafe_personal_destination');
}
