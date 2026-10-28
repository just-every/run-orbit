import {AccessService} from '../../access/service';
import {actorFence,guard,clearGuards,version} from '../../identity/store';
import type {AuthenticatedOperator} from '../../identity';
import {createId} from '../../../shared/ids';
import {payloadHash,type SourceSecurity} from '../../../platform/source-security';
import {CaptureError} from '../contracts';
import {connectSource} from '../sources';
import {checkedScopes,redirectUri,scopes,writeScopes,tenantId,tokenRequest,type Credential,type Provider,type ProviderFetch} from './config';
import {providerNetworkFetch} from './config';
const random=()=>btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
interface Pending{writebackConsent:boolean;clientId:string;clientSecret:string;name:string;tenant:string;verifier:string}
interface Flow{state_hash:string;provider:Provider;operator_id:string;session_id:string;origin:string;source_id:string;connection_id:string|null;ciphertext:string;expires_at:number}
export async function startOAuth(db:D1Database,security:SourceSecurity,provider:Provider,origin:string,actor:AuthenticatedOperator,input:Record<string,unknown>){
 if(typeof input.clientId!=='string'||!input.clientId.trim()||input.clientId.length>1000||typeof input.clientSecret!=='string'||!input.clientSecret||input.clientSecret.length>4000||typeof input.name!=='string'||!input.name.trim()||input.name.length>120)throw new CaptureError(400,'Enter the client ID, client secret and connection name.');
 const tenant=provider==='microsoft'?tenantId(input.tenant||'common'):'common',sourceId=input.sourceId||`capture-${createId().toLowerCase()}`;
 if(typeof sourceId!=='string'||!/^capture-[a-z0-9-]{1,60}$/.test(sourceId))throw new CaptureError(400,'Invalid capture source.');
 const source=await db.prepare('SELECT adapter,connection_id FROM capture_sources WHERE id=?').bind(sourceId).first<{adapter:string;connection_id:string|null}>();
 if(input.sourceId&&(!source||source.adapter!==provider))throw new CaptureError(409,'Reconnect the intended provider source.');
 const state=random(),verifier=random(),hash=await payloadHash(state),challenge=btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 const writebackConsent=input.writebackConsent===true||input.writebackConsent==='on';
 const pending:Pending={writebackConsent,clientId:input.clientId.trim(),clientSecret:input.clientSecret,name:input.name.trim(),tenant,verifier};
 await db.batch([db.prepare('DELETE FROM capture_oauth WHERE expires_at<? OR (source_id=? AND session_id=?)').bind(Date.now(),sourceId,actor.sessionId),db.prepare('INSERT INTO capture_oauth(state_hash,provider,operator_id,session_id,origin,source_id,connection_id,ciphertext,expires_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(hash,provider,actor.operatorId,actor.sessionId,origin,sourceId,source?.connection_id??null,await security.seal(JSON.stringify(pending)),Date.now()+600000)]);
 const url=new URL(provider==='google'?'https://accounts.google.com/o/oauth2/v2/auth':`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`);
 url.search=new URLSearchParams({client_id:pending.clientId,redirect_uri:redirectUri(origin,provider),response_type:'code',scope:[...scopes[provider],...(writebackConsent?[writeScopes[provider]]:[]),...(provider==='microsoft'?['offline_access']:[])].join(' '),state,code_challenge:challenge,code_challenge_method:'S256',...(provider==='google'?{access_type:'offline',prompt:'consent select_account'}:{prompt:'select_account',response_mode:'query'})}).toString();
 return {authorizationUrl:url.href};
}
export async function finishOAuth(db:D1Database,security:SourceSecurity,provider:Provider,origin:string,actor:AuthenticatedOperator,query:Record<string,string>,fetcher:ProviderFetch=providerNetworkFetch){
 if(!query.state||query.state.length>200)throw new CaptureError(400,'The provider connection expired or does not belong to this session.');
 const hash=await payloadHash(query.state),flow=await db.prepare('SELECT * FROM capture_oauth WHERE state_hash=? AND provider=? AND operator_id=? AND session_id=? AND origin=? AND expires_at>? AND claimed=0').bind(hash,provider,actor.operatorId,actor.sessionId,origin,Date.now()).first<Flow>();
 if(!flow)throw new CaptureError(400,'The provider connection expired or does not belong to this session.');
 const claimed=await db.prepare('UPDATE capture_oauth SET claimed=1 WHERE state_hash=? AND claimed=0 AND expires_at>?').bind(hash,Date.now()).run();
 if(claimed.meta.changes!==1)throw new CaptureError(409,'This provider connection has already been used.');
 try{
  if(query.error||!query.code||query.code.length>10000)throw new CaptureError(400,'The provider did not authorize the connection.');
  const access=new AccessService(db),context=await access.authorizeLegacy(actor,createId(),'legacy.write');
  const authority=await db.prepare(`SELECT ${version('o')} AS version FROM operators o WHERE id=?`).bind(actor.operatorId).first<{version:number}>();
  if(!authority)throw new CaptureError(403,'Operator authority changed.');
  const native=actorFence({id:actor.sessionId,operator:{id:actor.operatorId,version:authority.version}},Date.now());
  const pending=JSON.parse(await security.open(flow.ciphertext)) as Pending;
  const token=await tokenRequest(fetcher,provider,pending.tenant,new URLSearchParams({grant_type:'authorization_code',client_id:pending.clientId,client_secret:pending.clientSecret,code:query.code,code_verifier:pending.verifier,redirect_uri:redirectUri(origin,provider)}));
  const scope=checkedScopes(provider,token.scope);
  if(typeof token.refresh_token!=='string'||!token.refresh_token)throw new CaptureError(400,'The provider did not grant offline read access. Start a new connection and consent again.');
  const writeGranted=scope.split(/\s+/).some(value=>value===writeScopes[provider]||provider==='microsoft'&&value==='https://graph.microsoft.com/'+writeScopes.microsoft);
  if(pending.writebackConsent&&!writeGranted)throw new CaptureError(400,'Calendar writeback permission was not granted. Connect again without writeback or consent to its separate permission.');
  if(!pending.writebackConsent&&writeGranted)throw new CaptureError(400,'The provider granted calendar write access without separate writeback consent. Remove that permission at the provider and reconnect for read-only access.');
  const credential:Credential={writebackConsent:pending.writebackConsent,clientId:pending.clientId,clientSecret:pending.clientSecret,tenant:pending.tenant,accessToken:token.access_token,refreshToken:token.refresh_token,expiresAt:Date.now()+token.expires_in*1000,scope};
  const fence=db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'capture_oauth_fence',NULL WHERE NOT EXISTS(SELECT 1 FROM capture_oauth f JOIN sessions s ON s.id=f.session_id WHERE f.state_hash=? AND f.claimed=1 AND f.expires_at>? AND s.expires_at>? AND s.revoked_at IS NULL AND (NOT EXISTS(SELECT 1 FROM capture_sources c WHERE c.id=f.source_id) OR EXISTS(SELECT 1 FROM capture_sources c WHERE c.id=f.source_id AND c.connection_id IS f.connection_id)))`).bind(hash,Date.now(),new Date().toISOString());
  try{await connectSource(db,{id:flow.source_id,adapter:provider,name:pending.name,scope:{mail:{folders:[]},calendars:[]},credential:JSON.stringify(credential)},security,actor.operatorId,[fence,...access.fence(context).map(statement=>db.prepare(statement.sql).bind(...statement.bindings)),guard(db,native),clearGuards(db)]);}
  catch(error){if(/NOT NULL constraint failed: runtime_controls|access_write_guards|identity_guards/.test(String(error)))throw new CaptureError(409,'This provider connection was cancelled or changed. Start again.');throw error;}
  return flow.source_id;
 }finally{await db.prepare('DELETE FROM capture_oauth WHERE state_hash=?').bind(hash).run();}
}
