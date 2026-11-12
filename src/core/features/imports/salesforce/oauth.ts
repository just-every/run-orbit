import type {AuthenticatedOperator} from '../../identity';
import type {SourceSecurity} from '../../../platform/source-security';
import {payloadHash} from '../../../platform/source-security';
import {createId} from '../../../shared/ids';
import {RecordError} from '../../records/shared';
import {authorized,fence,random,oauthHost,callbackPath,instanceOrigin,sfId} from './security';
export type SalesforceFetch=(input:string,init?:RequestInit)=>Promise<Response>;
export interface Credential {clientId:string;clientSecret:string;accessToken:string;refreshToken:string;host:string}
interface Pending {clientId:string;clientSecret:string;verifier:string;sandbox:boolean}
export function checkedGrant(token:any){
 const granted=typeof token.scope==='string'?token.scope.split(/\s+/).filter(Boolean):[];
 if(!granted.includes('api')||!granted.includes('refresh_token')||granted.some((s:string)=>!['api','refresh_token'].includes(s)))throw new RecordError(409,'Salesforce must grant only API and refresh access. Remove broader connected-app scopes and authorize again.');
 if(typeof token.access_token!=='string'||!token.access_token||token.token_type?.toLowerCase()!=='bearer')throw new RecordError(409,'Salesforce returned no usable access grant.');
}
export async function tokenRequest(fetcher:SalesforceFetch,host:string,body:URLSearchParams){
 let response:Response;try{response=await fetcher(host+'/services/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body,redirect:'error'});}catch{throw new RecordError(409,'Salesforce authorization transport failed. Reconnect or retry the current pull.');}
 if(!response.ok)throw new RecordError(409,`Salesforce refused authorization (HTTP ${response.status}). Reconnect with read permission.`);
 try{return await response.json() as any;}catch{throw new RecordError(409,'Salesforce returned an unreadable authorization response.');}
}
export async function startOAuth(db:D1Database,security:SourceSecurity,actor:AuthenticatedOperator,origin:string,input:{clientId:string;clientSecret:string;sandbox:boolean}){
 await authorized(db,actor);
 const state=random(),verifier=random(),stateHash=await payloadHash(state),challenge=btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 const pending:Pending={...input,verifier};
 await db.batch([fence(db,actor),db.prepare('DELETE FROM crm_import_salesforce_oauth WHERE expires_at<? OR session_id=?').bind(Date.now(),actor.sessionId),db.prepare('INSERT INTO crm_import_salesforce_oauth(state_hash,operator_id,session_id,origin,ciphertext,expires_at) VALUES(?,?,?,?,?,?)').bind(stateHash,actor.operatorId,actor.sessionId,origin,await security.seal(JSON.stringify(pending)),Date.now()+600_000),fence(db,actor)]);
 const url=new URL(oauthHost(input.sandbox)+'/services/oauth2/authorize');url.search=new URLSearchParams({response_type:'code',client_id:input.clientId,redirect_uri:origin+callbackPath,scope:'api refresh_token',state,code_challenge:challenge,code_challenge_method:'S256',prompt:'consent'}).toString();return{authorizationUrl:url.href};
}
export async function finishOAuth(db:D1Database,security:SourceSecurity,actor:AuthenticatedOperator,origin:string,query:Record<string,string>,fetcher:SalesforceFetch){
 await authorized(db,actor);
 if(!query.state||query.state.length>200)throw new RecordError(400,'Salesforce state is missing or invalid.');
 const hash=await payloadHash(query.state),flow=await db.prepare('SELECT ciphertext FROM crm_import_salesforce_oauth WHERE state_hash=? AND operator_id=? AND session_id=? AND origin=? AND claimed=0 AND expires_at>?').bind(hash,actor.operatorId,actor.sessionId,origin,Date.now()).first<{ciphertext:string}>();
 if(!flow)throw new RecordError(409,'Salesforce state expired, was used, or belongs to another native session.');
 const claim=await db.prepare('UPDATE crm_import_salesforce_oauth SET claimed=1 WHERE state_hash=? AND claimed=0 AND expires_at>?').bind(hash,Date.now()).run();if(claim.meta.changes!==1)throw new RecordError(409,'Salesforce state was already used.');
 try{
  if(query.error||!query.code||query.code.length>10_000)throw new RecordError(409,'Salesforce authorization was refused. Start a new connection.');
  const codeHash=await payloadHash(query.code);
  if(await db.prepare('SELECT code_hash FROM crm_import_salesforce_codes WHERE code_hash=?').bind(codeHash).first())throw new RecordError(409,'Salesforce authorization code was already used.');
  await db.batch([fence(db,actor),db.prepare('INSERT INTO crm_import_salesforce_codes VALUES(?)').bind(codeHash)]);
  const pending=JSON.parse(await security.open(flow.ciphertext)) as Pending,host=oauthHost(pending.sandbox);
  const token=await tokenRequest(fetcher,host,new URLSearchParams({grant_type:'authorization_code',client_id:pending.clientId,client_secret:pending.clientSecret,code:query.code,code_verifier:pending.verifier,redirect_uri:origin+callbackPath}));
  checkedGrant(token);if(typeof token.refresh_token!=='string'||!token.refresh_token)throw new RecordError(409,'Salesforce did not grant refresh access. Authorize again.');
  const instance=instanceOrigin(token.instance_url),identity=new URL(token.id),match=/^\/id\/([A-Za-z0-9]+)\/([A-Za-z0-9]+)$/.exec(identity.pathname);
  if(![host,instance].includes(identity.origin)||identity.search||identity.hash||!match||!sfId(match[1])||!sfId(match[2]))throw new RecordError(409,'Salesforce returned no verified organization identity.');
  const credential:Credential={clientId:pending.clientId,clientSecret:pending.clientSecret,accessToken:token.access_token,refreshToken:token.refresh_token,host},id=createId();
  await db.batch([fence(db,actor),db.prepare('INSERT INTO crm_import_salesforce_connections VALUES(?,?,?,?,?,?)').bind(id,actor.operatorId,match[1],instance,await security.seal(JSON.stringify(credential)),new Date().toISOString()),fence(db,actor)]);return id;
 }finally{await db.prepare('DELETE FROM crm_import_salesforce_oauth WHERE state_hash=?').bind(hash).run();}
}
