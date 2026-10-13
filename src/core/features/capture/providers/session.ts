import {boundedResponse,objectResponse} from './response';
import {createId} from '../../../shared/ids';
import type {SourceSecurity} from '../../../platform/source-security';
import {CaptureError,CaptureProviderError} from '../contracts';
import {checkedScopes,tokenRequest,type Credential,type Provider,type ProviderFetch} from './config';
export interface ProviderSource{id:string;name:string;adapter:Provider;scope_json:string;state:string;connection_id:string|null;cursor:string|null}
/** A durable lease fences every read, refresh, intake and cursor update. Expired workers cannot write. */
export async function leaseSource(db:D1Database,id:string){
 const lease=createId(),now=Date.now();
 const claim=await db.prepare(`INSERT INTO capture_locks(source_id,lease,expires_at) VALUES(?,?,?) ON CONFLICT(source_id) DO UPDATE SET lease=excluded.lease,expires_at=excluded.expires_at WHERE capture_locks.expires_at<?`).bind(id,lease,now+60000,now).run();
 if(claim.meta.changes!==1)throw new CaptureError(409,'This source is already reading; try again shortly.');
 return lease;
}
export async function activeLease(db:D1Database,source:{id:string;connection_id:string|null},lease:string){
 const result=await db.prepare(`UPDATE capture_locks SET expires_at=? WHERE source_id=? AND lease=? AND expires_at>? AND EXISTS(SELECT 1 FROM capture_sources WHERE id=? AND connection_id IS ? AND state IN('connected','syncing'))`).bind(Date.now()+60000,source.id,lease,Date.now(),source.id,source.connection_id).run();
 if(result.meta.changes!==1)throw new CaptureError(409,'This source was disconnected; intake stopped. Its connection or scope may have changed.');
}
export function providerSession(db:D1Database,source:ProviderSource,lease:string,security:SourceSecurity,fetcher:ProviderFetch=fetch){
 const check=()=>activeLease(db,source,lease);
 async function credential(force=false){
  await check();
  const row=await db.prepare('SELECT ciphertext FROM capture_credentials WHERE source_id=?').bind(source.id).first<{ciphertext:string}>();
  if(!row)throw new CaptureError(409,'Reconnect this source.');
  let credential=JSON.parse(await security.open(row.ciphertext)) as Credential;
  if(force||credential.expiresAt<Date.now()+60000){
   await check();
   const result=await tokenRequest(fetcher,source.adapter,credential.tenant,new URLSearchParams({grant_type:'refresh_token',client_id:credential.clientId,client_secret:credential.clientSecret,refresh_token:credential.refreshToken}));
   const scope=result.scope===undefined?credential.scope:checkedScopes(source.adapter,result.scope);
   credential={...credential,accessToken:result.access_token,refreshToken:typeof result.refresh_token==='string'?result.refresh_token:credential.refreshToken,expiresAt:Date.now()+result.expires_in*1000,scope};
   await check();
   const saved=await db.prepare(`UPDATE capture_credentials SET ciphertext=?,updated_at=? WHERE source_id=? AND ciphertext=? AND EXISTS(SELECT 1 FROM capture_sources WHERE id=? AND connection_id IS ? AND state IN('connected','syncing')) AND EXISTS(SELECT 1 FROM capture_locks WHERE source_id=? AND lease=? AND expires_at>?)`).bind(await security.seal(JSON.stringify(credential)),new Date().toISOString(),source.id,row.ciphertext,source.id,source.connection_id,source.id,lease,Date.now()).run();
   if(saved.meta.changes!==1)throw new CaptureError(409,'The provider connection changed during refresh.');
  }
  return credential;
 }
 async function read(url:string,headers:Record<string,string>={},allowedErrors:readonly number[]=[]){
  const request=async(force=false)=>{
   const token=await credential(force);await check();
   try{return await fetcher(url,{method:'GET',redirect:'error',headers:{...headers,authorization:`Bearer ${token.accessToken}`},signal:AbortSignal.timeout(20000)});}catch{throw new CaptureProviderError('unavailable','The provider could not be reached.');}
  };
  let response=await request();await check();
  // An access token can expire early. Exchange the refresh grant once, durably, then retry the read once.
  if(response.status===401){await response.body?.cancel();response=await request(true);await check();}
  if(response.status===403){
   const body=await objectResponse(await boundedResponse(response));
   const reasons=Array.isArray(body.error?.errors)?body.error.errors.map((entry:any)=>entry.reason):[];
   if(body.error?.status==='RESOURCE_EXHAUSTED'||reasons.some((reason:string)=>['rateLimitExceeded','userRateLimitExceeded','dailyLimitExceeded','quotaExceeded'].includes(reason)))throw new CaptureProviderError('unavailable','The provider read quota is temporarily exhausted.');
   throw new CaptureProviderError('revoked','The provider refused read access.');
  }
  if(response.status===401){await response.body?.cancel();throw new CaptureProviderError('revoked','The provider refused read access.');}
  if(!response.ok&&response.status!==404&&response.status!==410&&!allowedErrors.includes(response.status)){await response.body?.cancel();throw new CaptureProviderError('unavailable','The provider could not finish the read.');}
  return boundedResponse(response);
 }
 return {check,read,async json(url:string,headers?:Record<string,string>){const response=await read(url,headers);if(!response.ok)throw new CaptureProviderError('unavailable','The selected provider resource is no longer available.');return objectResponse(response);}};
}
export type ProviderSession=ReturnType<typeof providerSession>;
