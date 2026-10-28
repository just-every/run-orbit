import {privatePaths,coversPrivatePath} from '../access/field-policy';
import {salesProfile,teamIds,type SalesProfile} from './policy';
import type {SqlValue} from '../../shared/expansion-contracts';
export interface SalesFragment {sql:string;bindings:SqlValue[]}
const literal=(value:string)=>`'${value.replaceAll("'","''")}'`;
/** Ownership is read from the native owner register on every request. Shares never change it. */
export async function salesRowPolicy(db:D1Database,id:string,alias='r'):Promise<SalesFragment & {base?:string;editable?:string}>{
 const profile=await salesProfile(db,id);if(!profile)return{sql:'0',bindings:[]};
 if(!/^[a-z_]+$/.test(alias))throw new Error('Invalid internal record alias.');
 if(profile.role==='sales-admin')return{sql:'1',bindings:[]};
 const who=literal(id),teams=literal(JSON.stringify(await teamIds(db,id))),owner=`COALESCE((SELECT own.owner_id FROM main.record_ownership own WHERE own.record_type=${alias}.kind AND own.record_id=${alias}.id),json_extract(${alias}.fields_json,'$.owner_id'),${alias}.owner_id)`;
 const owned=profile.scope==='all'?'1':profile.scope==='team'?`${owner} IN(SELECT member.operator_id FROM main.sales_team_members member JOIN main.operators person ON person.id=member.operator_id WHERE member.team_id IN(SELECT value FROM json_each(${teams})) AND person.status='active')`:`${owner}=${who}`;
 const ordinary=`((${owned}) AND (${alias}.visibility='workspace' OR ${owner}=${who}))`;
 const shared=`EXISTS(SELECT 1 FROM main.sales_record_shares share WHERE share.kind=${alias}.kind AND share.record_id=${alias}.id AND ((share.subject_kind='user' AND share.subject_id=${who}) OR (share.subject_kind='team' AND share.subject_id IN(SELECT value FROM json_each(${teams})))))`;
 const associated=profile.includeAssociations?` OR (${alias}.kind IN('contact','company') AND EXISTS(SELECT 1 FROM main.opportunities deal WHERE deal.owner_id=${who} AND ((${alias}.kind='company' AND deal.company_id=${alias}.id) OR (${alias}.kind='contact' AND EXISTS(SELECT 1 FROM main.opportunity_contacts link WHERE link.opportunity_id=deal.id AND link.contact_id=${alias}.id)))))`:'';
 return{sql:`(${ordinary} OR ${shared}${associated})`,base:`(${ordinary}${associated})`,editable:ordinary,bindings:[]};
}
export function salesFieldAllowed(profile:SalesProfile,field:string){
 if(profile.fields.includes('*')||profile.fields.some(path=>field===path||field.startsWith(path+'.')))return true;
 const group=/amount|value_cents|price|quota|revenue|margin/i.test(field)?'amounts':/email|mail|body|recipient/i.test(field)?'mail':/note|payload|description|internal|private|secret/i.test(field)?'notes':/file|attachment/i.test(field)?'files':null;
 return group===null||profile.fields.includes(group);
}
export function salesFieldPolicy(profile:SalesProfile,expression:string):SalesFragment{
 const fields=literal(JSON.stringify(profile.fields));
 return{sql:`(EXISTS(SELECT 1 FROM json_each(${fields}) field_grant WHERE field_grant.value='*' OR field_grant.value=${expression} OR substr(${expression},1,length(field_grant.value)+1)=field_grant.value||'.') OR CASE WHEN ${expression} GLOB '*amount*' OR ${expression} GLOB '*value_cents*' OR ${expression} GLOB '*price*' OR ${expression} GLOB '*quota*' OR ${expression} GLOB '*revenue*' OR ${expression} GLOB '*margin*' THEN EXISTS(SELECT 1 FROM json_each(${fields}) WHERE value='amounts') WHEN ${expression} GLOB '*email*' OR ${expression} GLOB '*mail*' OR ${expression} GLOB '*body*' OR ${expression} GLOB '*recipient*' THEN EXISTS(SELECT 1 FROM json_each(${fields}) WHERE value='mail') WHEN ${expression} GLOB '*note*' OR ${expression} GLOB '*payload*' OR ${expression} GLOB '*description*' OR ${expression} GLOB '*internal*' OR ${expression} GLOB '*private*' OR ${expression} GLOB '*secret*' THEN EXISTS(SELECT 1 FROM json_each(${fields}) WHERE value='notes') WHEN ${expression} GLOB '*file*' OR ${expression} GLOB '*attachment*' THEN EXISTS(SELECT 1 FROM json_each(${fields}) WHERE value='files') ELSE 1 END)`,bindings:[]};
}
export async function salesCanRead(db:D1Database,id:string,kind:string,recordId:string,fields:readonly string[]=[]){
 const profile=await salesProfile(db,id);if(!profile||fields.some(field=>!salesFieldAllowed(profile,field)))return false;
 const stored=fields.length?await db.prepare('SELECT fields_json FROM graph_records WHERE kind=? AND id=? AND retired_into_id IS NULL').bind(kind,recordId).first<{fields_json:string}>():null,definitions=fields.length?await db.prepare("SELECT fields_json FROM schema_types WHERE workspace_id='workspace' AND name=?").bind(kind).first<{fields_json:string}>():null;
 if(fields.length&&!stored)return false;for(const field of fields)if(privatePaths(field,JSON.parse(definitions?.fields_json??'{}'),JSON.parse(stored?.fields_json??'{}')).some(path=>!profile.fields.some(grant=>coversPrivatePath(grant,path))))return false;
 const row=await salesRowPolicy(db,id);for(const field of fields){const permitted=await salesScopedFieldPolicy(db,id,literal(field));if(!await db.prepare(`SELECT 1 FROM graph_records r WHERE r.kind=? AND r.id=? AND ${row.sql} AND ${permitted.sql}`).bind(kind,recordId,...row.bindings,...permitted.bindings).first())return false;}return Boolean(await db.prepare(`SELECT 1 FROM graph_records r WHERE r.kind=? AND r.id=? AND r.retired_into_id IS NULL AND ${row.sql}`).bind(kind,recordId,...row.bindings).first());
}
export async function salesCanEdit(db:D1Database,id:string,kind:string,recordId:string,fields:readonly string[]=[]){
 const profile=await salesProfile(db,id);if(!profile||profile.role==='read-only'||!await salesCanRead(db,id,kind,recordId,fields))return false;
 const policy=await salesRowPolicy(db,id);
 if(!policy.editable)return profile.role==='sales-admin';
 if(await db.prepare(`SELECT 1 FROM graph_records r WHERE r.kind=? AND r.id=? AND (${policy.editable})`).bind(kind,recordId,...policy.bindings).first())return true;
 const teams=await teamIds(db,id);
 return Boolean(await db.prepare("SELECT 1 FROM sales_record_shares WHERE kind=? AND record_id=? AND can_edit=1 AND ((subject_kind='user' AND subject_id=?) OR (subject_kind='team' AND subject_id IN(SELECT value FROM json_each(?))))").bind(kind,recordId,id,JSON.stringify(teams)).first());
}

/** Field grants on a share restrict that share; membership never broadens a share's fields. */
export async function salesScopedFieldPolicy(db:D1Database,id:string,expression:string,alias='r'):Promise<SalesFragment>{
 const profile=await salesProfile(db,id);if(!profile)return{sql:'0',bindings:[]};
 const field=salesFieldPolicy(profile,expression),row=await salesRowPolicy(db,id,alias);const parent=await salesRowPolicy(db,id,'sales_parent');const association=`(${expression}<>'company_id' OR json_extract(${alias}.fields_json,'$.company_id') IS NULL OR EXISTS(SELECT 1 FROM main.graph_records sales_parent WHERE sales_parent.kind='company' AND sales_parent.id=json_extract(${alias}.fields_json,'$.company_id') AND sales_parent.retired_into_id IS NULL AND ${parent.sql}))`;if(!row.base)return{sql:`(${field.sql} AND ${association})`,bindings:field.bindings};
 const teams=literal(JSON.stringify(await teamIds(db,id))),who=literal(id);
 const shared=`EXISTS(SELECT 1 FROM main.sales_record_shares share,json_each(share.fields_json) permission WHERE share.kind=${alias}.kind AND share.record_id=${alias}.id AND ((share.subject_kind='user' AND share.subject_id=${who}) OR (share.subject_kind='team' AND share.subject_id IN(SELECT value FROM json_each(${teams})))) AND (permission.value='*' OR permission.value=${expression} OR substr(${expression},1,length(permission.value)+1)=permission.value||'.'))`;
 return{sql:`(${field.sql} AND (${row.base} OR ${shared}) AND ${association})`,bindings:field.bindings};
}
