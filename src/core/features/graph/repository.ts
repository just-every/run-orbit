import type {ActorContext,ResourceRef,RecordProjection,PageInput,Json} from '../../shared/expansion-contracts';
import {AccessService} from '../access/service';
import {ScopedMutations,sha256} from '../access/mutations';
import {AccessError,check,deny} from '../access/errors';
import {principalKey} from '../access/policy';
import {graphReadPolicy} from '../access/query-policy';
import {project,type StoredRecord} from './storage';
export class GraphRecords extends ScopedMutations {
 async stored(c:ActorContext,record:ResourceRef):Promise<StoredRecord>{
  if(record.tenantId!==c.tenantId||record.workspaceId!==c.workspaceId)deny();
  const row=await this.db.prepare('SELECT * FROM graph_records WHERE tenant_id=? AND workspace_id=? AND id=? AND kind=? AND retired_into_id IS NULL').bind(c.tenantId,c.workspaceId,record.id,record.type).first<StoredRecord>();
  if(!row)throw new AccessError('permission','Record is unavailable.');return row;
 }
 async getRecord(c:ActorContext,record:ResourceRef,fields:readonly string[]):Promise<RecordProjection>{
  if(record.tenantId!==c.tenantId||record.workspaceId!==c.workspaceId)deny();
  const policy=await graphReadPolicy(this.access,c),permitted=policy.field('f.key');
  const row=(await this.read<StoredRecord&{allowed_fields:string}>(c,`SELECT r.*, (SELECT json_group_array(f.key) FROM json_each(r.fields_json) f WHERE ${permitted.sql}) AS allowed_fields FROM graph_records r WHERE r.tenant_id=? AND r.workspace_id=? AND r.id=? AND r.kind=? AND r.retired_into_id IS NULL AND ${policy.row.sql}`,[...permitted.bindings,c.tenantId,c.workspaceId,record.id,record.type,...policy.row.bindings])).results[0];
  if(!row)deny('Record is unavailable.');const allowed=JSON.parse(row.allowed_fields) as string[];if(fields.some(f=>!allowed.includes(f)&&Object.hasOwn(JSON.parse(row.fields_json),f)))deny('One or more requested fields are restricted.');const result=(await policy.filter([project(row,fields.length?fields:allowed)],fields))[0];if(!result)deny('Record does not meet the current published audience.');return result;
 }
 async searchRecords(c:ActorContext,input:PageInput&{types:string[];query:string;fields:string[];filters:Record<string,Json>}){check(input.limit<=100,'Page size must be 1–100.');return this.scanRecords(c,input);}
 /** Internal report scanner shares all row, field, epoch and cursor fences. */
 async scanRecords(c:ActorContext,input:PageInput&{types:string[];query:string;fields:string[];filters:Record<string,Json>}){
  check(Number.isInteger(input.limit)&&input.limit>0&&input.limit<=1000,'Scan page size must be 1–1000.');check(input.query.length<=500,'Search query is too long.');
  const epoch=(await this.db.prepare('SELECT epoch FROM graph_workspace_epochs WHERE workspace_id=?').bind(c.workspaceId).first<{epoch:number}>())!.epoch;
  const epochGuard=crypto.randomUUID();this.access.addDependencyFences(c,[{sql:'INSERT INTO access_write_guards VALUES(?,CASE WHEN EXISTS(SELECT 1 FROM graph_workspace_epochs WHERE workspace_id=? AND epoch=?) THEN 1 ELSE 0 END)',bindings:[epochGuard,c.workspaceId,epoch]},{sql:'DELETE FROM access_write_guards WHERE id=?',bindings:[epochGuard]}],'graph-population');
  const signature=await sha256(JSON.stringify([c.tenantId,c.workspaceId,c.policyEpoch,principalKey(c.principal),input.types,input.query,input.fields,input.filters,epoch]));let after='',afterKind='';
  if(input.cursor){try{const value=JSON.parse(atob(input.cursor));check(value.signature===signature,'Cursor scope or permissions changed.');after=value.after;afterKind=value.afterKind;check(typeof after==='string'&&typeof afterKind==='string','Invalid cursor.');}catch{throw new AccessError('validation','Cursor is stale or belongs to another query.');}}
  const policy=await graphReadPolicy(this.access,c),limit=policy.pageLimit(input.limit),fieldsPolicy=policy.field('f.key');const clauses=[`r.tenant_id=? AND r.workspace_id=? AND r.retired_into_id IS NULL AND (r.id>? OR(r.id=? AND r.kind>?))`,policy.row.sql];const bindings:any[]=[c.tenantId,c.workspaceId,after,after,afterKind,...policy.row.bindings];
  if(input.types.length){clauses.push(`r.kind IN (${input.types.map(()=>'?').join(',')})`);bindings.push(...input.types);}
  if(input.query.trim()){const tokens=input.query.match(/[\p{L}\p{N}_]+/gu)??[];check(tokens.length>0,'Search requires a word.');const search=policy.field('record_search_fields.field_name');clauses.push(`r.id IN (SELECT record_search_fields.record_id FROM record_search_fields WHERE record_search_fields MATCH ? AND record_search_fields.workspace_id=? AND record_search_fields.record_kind=r.kind AND ${search.sql})`);bindings.push(`body : (${tokens.map(token=>`"${token}"*`).join(' AND ')})`,c.workspaceId,...search.bindings);}
  for(const [field,value] of Object.entries(input.filters)){const filter=policy.field('f.key');clauses.push(`EXISTS(SELECT 1 FROM json_each(r.fields_json) f WHERE f.key=? AND f.value IS json_extract(?,'$') AND ${filter.sql})`);bindings.push(field,JSON.stringify(value),...filter.bindings);}
  for(const field of input.fields){const requested=policy.field('f.key');clauses.push(`NOT EXISTS(SELECT 1 FROM json_each(r.fields_json) f WHERE f.key=? AND NOT ${requested.sql})`);bindings.push(field,...requested.bindings);}
  const rows=(await this.read<StoredRecord&{allowed_fields:string}>(c,`SELECT r.*, (SELECT json_group_array(f.key) FROM json_each(r.fields_json) f WHERE ${fieldsPolicy.sql}) AS allowed_fields FROM graph_records r WHERE ${clauses.join(' AND ')} ORDER BY r.id,r.kind LIMIT ?`,[...fieldsPolicy.bindings,...bindings,limit+1])).results;
  const hasMore=rows.length>limit,selected=rows.slice(0,limit);const items=await policy.filter(selected.map(row=>project(row,input.fields.length?input.fields:JSON.parse(row.allowed_fields))),input.fields);
  return {items,nextCursor:hasMore?btoa(JSON.stringify({signature,after:selected.at(-1)!.id,afterKind:selected.at(-1)!.kind})):null,watermark:`${c.policyEpoch}`,incomplete:false};
 }
}
