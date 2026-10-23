import {AccessError} from '../access/errors';
import {RecordError} from '../records/shared';
import type {FormIntake} from './definition';
export interface FormAbuseOptions {secret?:string;turnstileSecret?:string;fetch?:typeof fetch}
const encoder=new TextEncoder();
const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
export class FormAbuse {
 constructor(readonly db:D1Database,readonly options:FormAbuseOptions={}){}
 private async sign(value:string){if(!this.options.secret)throw new AccessError('prerequisite','Form protection is not configured.');const key=await crypto.subtle.importKey('raw',encoder.encode(this.options.secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',key,encoder.encode(value)));}
 async challenge(operationId:string,idempotencyKey:string){const body=JSON.stringify([operationId,idempotencyKey,Date.now()]);return `${btoa(body)}.${await this.sign(body)}`;}
 /** Counts one attempt; past either limit it is refused before any refusal or payload is retained. */
 async admit(formId:string,request?:Request){
  // Only Cloudflare's trusted connection metadata enables its injected address.
  // Local requests share one bucket; X-Forwarded-For never contributes.
  const ip=(request as (Request&{cf?:unknown})|undefined)?.cf?request!.headers.get('CF-Connecting-IP')??'local':'local';
  const digest=await this.sign(`form-network:${ip}`),now=Date.now(),expires=now+60000;
  const buckets=[`form:${formId}`,`form-network:${digest}`];
  const result=await this.db.batch([this.db.prepare('DELETE FROM public_rate_limits WHERE expires_at<=?').bind(now),...buckets.map(bucket=>this.db.prepare('INSERT INTO public_rate_limits(bucket,count,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=CASE WHEN expires_at<=? THEN 1 ELSE count+1 END,expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END RETURNING count').bind(bucket,expires,now,now))]);
  if(Number((result[1].results[0] as {count:number}).count)>30||Number((result[2].results[0] as {count:number}).count)>10)throw new RecordError(429,'Form submission refused: rate_limit.');
 }
 async reason(intake:FormIntake,operationId:string,siteKey?:string,hostname?:string){
  if(intake.honeypot?.trim())return 'honeypot';
  const [encoded,signature,...extra]=(intake.fillToken??'').split('.');
  try{const body=atob(encoded),expected=await this.sign(body);let difference=expected.length^signature.length;for(let i=0;i<expected.length;i++)difference|=expected.charCodeAt(i)^signature.charCodeAt(i);const [operation,key,issued]=JSON.parse(body);if(extra.length||difference||operation!==operationId||key!==intake.idempotencyKey||!Number.isSafeInteger(issued)||Date.now()-issued<2000||Date.now()-issued>3600000)return 'fill_time';}catch(error){if(error instanceof AccessError)throw error;return 'fill_time';}
  if(siteKey){if(!this.options.turnstileSecret)return 'turnstile_unconfigured';if(!intake.turnstileToken)return 'turnstile';try{const response=await (this.options.fetch??fetch)('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:this.options.turnstileSecret,response:intake.turnstileToken})});const result=await response.json() as {success?:boolean;action?:string;hostname?:string};if(!response.ok||result.success!==true||result.action!=='orbit_form'||!hostname||result.hostname!==hostname)return 'turnstile';}catch{return 'turnstile_unavailable';}}
  return null;
 }
}
