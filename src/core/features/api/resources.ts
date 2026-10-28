import {salesProfile} from '../teams/policy';
import {salesCanRead,salesCanEdit,salesRowPolicy,salesScopedFieldPolicy} from '../teams/record-access';
import {hash} from '../delegation/protocol';
import {RecordsRepository} from '../records/repository';
import {audit,RecordError} from '../records/shared';
import {guard,clearGuards} from '../identity/store';
import type {Clock} from '../../platform/clock';
import {ApiError,apiScope,apiTransaction,type ApiCredential} from './authority';

type Deal=Record<string,string|number|null>;
export const dealRevision=async(row:Deal)=>'"'+await hash(JSON.stringify(row))+'"';
const projected=(row:Deal,fields:string[])=>Object.fromEntries(['id',...fields].map(field=>[field,row[field]]));

export class ApiDeals {
 constructor(readonly db:D1Database,readonly clock:Clock){}
 async list(credential:ApiCredential,input:{limit:number;cursor?:string;title?:string},fields:string[]){
  apiScope(credential,'deal.read',undefined,fields);
  const profile=await salesProfile(this.db,credential.principal_id),row=profile?await salesRowPolicy(this.db,credential.principal_id):{sql:'1',bindings:[]},checks=profile?await Promise.all([...fields,...(input.title?['title']:[])].map(field=>salesScopedFieldPolicy(this.db,credential.principal_id,`'${field}'`))):[];
  const result=await apiTransaction(this.db,credential,this.clock,[this.db.prepare(`SELECT d.* FROM opportunities d JOIN graph_records r ON r.kind='opportunity' AND r.id=d.id AND r.retired_into_id IS NULL WHERE d.id IN(SELECT value FROM json_each(?)) AND d.id>? AND (? IS NULL OR d.title=?) AND ${row.sql} ${checks.map(check=>`AND ${check.sql}`).join(' ')} ORDER BY d.id LIMIT ?`).bind(credential.records_json,input.cursor??'',input.title??null,input.title??null,input.limit+1)]);
  const rows=result[1]!.results as Deal[],more=rows.length>input.limit,page=rows.slice(0,input.limit);
  return {deals:page.map(row=>projected(row,fields)),nextCursor:more?String(page.at(-1)!.id):null};
 }
 async read(credential:ApiCredential,id:string,fields:string[]){
  apiScope(credential,'deal.read',id,fields);
  if(await salesProfile(this.db,credential.principal_id)&&!await salesCanRead(this.db,credential.principal_id,'opportunity',id,fields))throw new ApiError(403,'Current sales record or field access is required.');
  const result=await apiTransaction(this.db,credential,this.clock,[this.db.prepare('SELECT * FROM opportunities WHERE id=?').bind(id)]);
  const row=result[1]!.results[0] as Deal|undefined;
  if(!row)throw new ApiError(404,'Deal not found.');
  return {deal:projected(row,fields),etag:await dealRevision(row)};
 }
 private async receipt(credential:ApiCredential,key:string,fingerprint:string){
  const previous=await this.db.prepare("SELECT entity_id,json_extract(details_json,'$.fingerprint') AS fingerprint FROM audit_entries WHERE action='api.deal_created' AND json_extract(details_json,'$.credentialId')=? AND json_extract(details_json,'$.key')=?").bind(credential.id,key).first<{entity_id:string;fingerprint:string}>();
  if(!previous)return;
  if(previous.fingerprint!==fingerprint)throw new ApiError(409,'The idempotency key was already used with different content.');
  await apiTransaction(this.db,credential,this.clock,[]);
  apiScope(credential,'deal.create',previous.entity_id);
  if(!await this.db.prepare('SELECT id FROM opportunities WHERE id=?').bind(previous.entity_id).first())throw new ApiError(409,'The original deal no longer exists.');
  return {id:previous.entity_id,replayed:true};
 }
 async create(credential:ApiCredential,input:Record<string,unknown>,key:string){
  apiScope(credential,'deal.create',undefined,Object.keys(input));
  const sales=await salesProfile(this.db,credential.principal_id);if(sales?.role==='read-only')throw new ApiError(403,'This sales role cannot create deals.');
  const fingerprint=await hash(JSON.stringify(Object.keys(input).sort().map(field=>[field,input[field]]))),keyHash=await hash(key);
  const previous=await this.receipt(credential,keyHash,fingerprint);if(previous)return previous;
  // Explicit creation authority includes only the new records this credential creates.
  const records=JSON.parse(credential.records_json) as string[];
  if(records.length>=100)throw new ApiError(409,'The credential record scope is full; ask its administrator for a new scope.');
  const plan=await new RecordsRepository(this.db).prepareSave('opportunity',{...input,...(sales?{owner_id:credential.principal_id}:{})},credential.principal_id);
  const guard=crypto.randomUUID();
  try{await apiTransaction(this.db,credential,this.clock,[
   this.db.prepare("INSERT INTO access_write_guards VALUES(?,CASE WHEN NOT EXISTS(SELECT 1 FROM audit_entries WHERE action='api.deal_created' AND json_extract(details_json,'$.credentialId')=? AND json_extract(details_json,'$.key')=?) THEN 1 ELSE 0 END)").bind(guard,credential.id,keyHash),
   ...plan.statements,
   this.db.prepare('UPDATE api_credentials SET records_json=? WHERE id=?').bind(JSON.stringify([...records,plan.id].sort()),credential.id),
   audit(this.db,credential.principal_id,'api.deal_created','opportunity',plan.id,{credentialId:credential.id,key:keyHash,fingerprint}),
   this.db.prepare('DELETE FROM access_write_guards WHERE id=?').bind(guard),
  ]);}catch(error){
   const replay=await this.receipt(credential,keyHash,fingerprint);if(replay)return replay;
   throw error;
  }
  return {id:plan.id,replayed:false};
 }
 async update(credential:ApiCredential,id:string,input:Record<string,unknown>,expected:string){
  apiScope(credential,'deal.update',id,Object.keys(input));
  if(await salesProfile(this.db,credential.principal_id)&&!await salesCanEdit(this.db,credential.principal_id,'opportunity',id,Object.keys(input)))throw new ApiError(403,'Current sales edit permission is required.');
  const before=await this.db.prepare('SELECT * FROM opportunities WHERE id=?').bind(id).first<Deal>();
  if(!before)throw new ApiError(404,'Deal not found.');
  if(await dealRevision(before)!==expected)throw new ApiError(409,'The deal changed; read it again.');
  const plan=await new RecordsRepository(this.db).prepareSave('opportunity',{...before,...input},credential.principal_id,id,{ordinaryEdit:true}),columns=Object.keys(before);
  try{await apiTransaction(this.db,credential,this.clock,[
   guard(this.db,{sql:`EXISTS(SELECT 1 FROM opportunities WHERE ${columns.map(field=>`${field} IS ?`).join(' AND ')})`,args:columns.map(field=>before[field])}),
   ...plan.statements,clearGuards(this.db),
  ]);}catch(error){if(/identity_guards|value\s*=\s*1|runtime_controls.value/.test(String(error)))throw new RecordError(409,'The deal or its policies changed; review it again.');throw error;}
  return {id};
 }
}
