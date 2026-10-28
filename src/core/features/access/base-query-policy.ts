import type {ActorContext,SqlValue} from '../../shared/expansion-contracts';
import {AccessService} from './service';
import {AccessError,deny} from './errors';
import {roleAllows} from './policy';
import {privatePathsSql} from './field-policy';
import {isFullOperator,fullOperatorFence} from './identity-class';
export interface Fragment{sql:string;bindings:SqlValue[]}
export async function baseGraphReadPolicy(access:AccessService,c:ActorContext,alias='r'):Promise<{row:Fragment;field:(expression:string,pathsSql?:string)=>Fragment}>{
 if(!['r','record','account','person'].includes(alias))throw new Error('Invalid internal record alias');
 const current=await access.refreshContext(c);if(c.principal.kind!=='operator'&&c.principal.kind!=='agent')deny();
 if(await isFullOperator(access.db,c.principal.operatorId)){access.addDependencyFences(c,fullOperatorFence(c),'native-class');return{row:{sql:'1',bindings:[]},field:()=>({sql:'1',bindings:[]})};}
 if(current.policyEpoch!==c.policyEpoch)throw new AccessError('conflict','Permissions changed; refresh workspace context.');
 const operator=c.principal.operatorId,membership=await access.db.prepare('SELECT role FROM access_memberships WHERE workspace_id=? AND operator_id=?').bind(c.workspaceId,operator).first<{role:string}>();
 const bundle=await access.db.prepare('SELECT actions_json,fields_json FROM access_role_bundles WHERE workspace_id=? AND role=?').bind(c.workspaceId,membership?.role??'guest').first<{actions_json:string;fields_json:string}>();
 const role=bundle?JSON.parse(bundle.actions_json).includes('graph.read'):roleAllows(membership?.role??'guest','graph.read');
 const grants=(await access.grants(c)).filter(g=>JSON.parse(g.actions_json).includes('graph.read'));
 const base:Fragment=role?{sql:`(${alias}.visibility='workspace' OR ${alias}.owner_id=?)`,bindings:[operator]}:{sql:'0',bindings:[]};
 const combine=(values:Fragment[],join='OR'):Fragment=>{const sql=(start:number,end:number):string=>end<=start?'0':end-start===1?values[start].sql:`(${sql(start,Math.floor((start+end)/2))} ${join} ${sql(Math.floor((start+end)/2),end)})`;return{sql:sql(0,values.length),bindings:values.flatMap(v=>v.bindings)};};
 // One bound grant-id set keeps repeated graph field predicates within D1's
 // variable limit while checking live scope, fields and expiry at the read.
 const liveGrant=combine([
  {sql:'permitted_grant.id IN(SELECT value FROM json_each(?))',bindings:[JSON.stringify(grants.map(grant=>grant.id))]},
  {sql:"permitted_grant.subject_kind='operator' AND permitted_grant.subject_id=?",bindings:[operator]},
  {sql:`permitted_grant.workspace_id=${alias}.workspace_id AND permitted_grant.tenant_id=${alias}.tenant_id`,bindings:[]},
  {sql:`permitted_grant.resource_type IN('*',${alias}.kind) AND permitted_grant.resource_id IN('*',${alias}.id)`,bindings:[]},
  {sql:"permitted_grant.revoked_at IS NULL AND (permitted_grant.expires_at IS NULL OR permitted_grant.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now'))",bindings:[]},
  {sql:"EXISTS(SELECT 1 FROM json_each(permitted_grant.actions_json) granted_action WHERE granted_action.value='graph.read')",bindings:[]},
 ],'AND');
 const permitted=(field?:string):Fragment=>grants.length?{sql:`EXISTS(SELECT 1 FROM main.access_grants permitted_grant ${field?',json_each(permitted_grant.fields_json) permission':''} WHERE ${liveGrant.sql} ${field?`AND (permission.value='*' OR permission.value=${field})`:''})`,bindings:liveGrant.bindings}:{sql:'0',bindings:[]};
 const row=combine([base,permitted()]),parent={sql:row.sql.replaceAll(`${alias}.`,'parent_record.'),bindings:row.bindings};
 return{row,field:(expression:string,pathsSql?:string)=>{
  const normal=combine([base,bundle?{sql:`EXISTS(SELECT 1 FROM json_each(?) bundle_field WHERE bundle_field.value='*' OR bundle_field.value=${expression})`,bindings:[bundle.fields_json]}:{sql:'1',bindings:[]}],'AND');
  const covered=permitted('hidden.path');
  const readable=combine([combine([normal,permitted(expression)]),{sql:`NOT EXISTS(SELECT 1 FROM (${pathsSql??privatePathsSql(alias,expression)}) hidden WHERE NOT COALESCE(${covered.sql},0))`,bindings:covered.bindings}],'AND');
  return combine([readable,{sql:`(${expression}<>'company_id' OR json_extract(${alias}.fields_json,'$.company_id') IS NULL OR EXISTS(SELECT 1 FROM graph_records parent_record WHERE parent_record.kind='company' AND parent_record.id=json_extract(${alias}.fields_json,'$.company_id') AND parent_record.workspace_id=${alias}.workspace_id AND parent_record.tenant_id=${alias}.tenant_id AND parent_record.retired_into_id IS NULL AND ${parent.sql}))`,bindings:parent.bindings}],'AND');
 }};
}
