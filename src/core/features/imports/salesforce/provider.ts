import type {AuthenticatedOperator} from '../../identity';
import type {SourceSecurity} from '../../../platform/source-security';
import {RecordError} from '../../records/shared';
import {authorized,fence,instanceOrigin,api} from './security';
import {tokenRequest,checkedGrant,type Credential,type SalesforceFetch} from './oauth';
export interface Connection {id:string;actor_id:string;org_id:string;instance:string;ciphertext:string}
export class SalesforceProvider {
 constructor(readonly db:D1Database,readonly security:SourceSecurity,readonly actor:AuthenticatedOperator,readonly id:string,readonly fetcher:SalesforceFetch){}
 async connection(){await authorized(this.db,this.actor);const row=await this.db.prepare('SELECT * FROM crm_import_salesforce_connections WHERE id=? AND actor_id=?').bind(this.id,this.actor.operatorId).first<Connection>();if(!row)throw new RecordError(409,'Salesforce is disconnected. Reconnect before starting another pull.');return row;}
 guard(row:Connection){return this.db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'salesforce_connection',NULL WHERE NOT EXISTS(SELECT 1 FROM crm_import_salesforce_connections WHERE id=? AND ciphertext=? AND actor_id=?)").bind(row.id,row.ciphertext,this.actor.operatorId);}
 async get(path:string){
  if(!path.startsWith(api+'/')||path.includes('#')||path.includes('\\')||path.includes('..'))throw new RecordError(409,'Salesforce returned an unsafe API reference.');
  let connection=await this.connection(),credential:Credential;try{credential=JSON.parse(await this.security.open(connection.ciphertext));}catch{throw new RecordError(409,'Salesforce custody cannot be opened on this installation. Reconnect.');}
  const url=new URL(path,instanceOrigin(connection.instance));
  const send=async()=>{await this.connection();try{return await this.fetcher(url.href,{method:'GET',headers:{Authorization:`Bearer ${credential.accessToken}`,'Sforce-Query-Options':'batchSize=200'},redirect:'error'});}catch{throw new RecordError(409,'Salesforce read transport failed. Resume this saved checkpoint.');}};
  let response=await send();
  if(response.status===401){
   const token=await tokenRequest(this.fetcher,credential.host,new URLSearchParams({grant_type:'refresh_token',client_id:credential.clientId,client_secret:credential.clientSecret,refresh_token:credential.refreshToken}));
   if(token.scope!==undefined)checkedGrant(token);else if(typeof token.access_token!=='string'||!token.access_token||token.token_type?.toLowerCase()!=='bearer')throw new RecordError(409,'Salesforce refresh returned no usable grant. Reconnect.');
   if(token.instance_url&&instanceOrigin(token.instance_url)!==connection.instance)throw new RecordError(409,'Salesforce changed instance. Reconnect before pulling.');
   credential={...credential,accessToken:token.access_token,...typeof token.refresh_token==='string'?{refreshToken:token.refresh_token}:{}};
   const ciphertext=await this.security.seal(JSON.stringify(credential));
   await this.db.batch([fence(this.db,this.actor),this.guard(connection),this.db.prepare('UPDATE crm_import_salesforce_connections SET ciphertext=? WHERE id=? AND ciphertext=?').bind(ciphertext,connection.id,connection.ciphertext),fence(this.db,this.actor)]);
   connection={...connection,ciphertext};response=await send();
  }
  if(!response.ok)throw new RecordError(409,`Salesforce read stopped (HTTP ${response.status}). Check object and field read permissions, then resume the saved checkpoint; an expired query cursor requires a fresh pull.`);
  let body:any;try{const text=await response.text();if(text.length>2_000_000)throw new Error();body=JSON.parse(text);}catch{throw new RecordError(409,'Salesforce returned an unreadable or oversized page. Export fewer records.');}
  await this.db.batch([fence(this.db,this.actor),this.guard(connection)]);return{body,connection};
 }
}
