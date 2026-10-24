import type {ActorContext,SqlValue} from '../../shared/expansion-contracts';
import {AccessService} from './service';
import {graphReadPolicy} from './query-policy';
import {deny} from './errors';
import {privatePathsSql} from './field-policy';
const policyCache=new WeakMap<ActorContext,ReturnType<typeof graphReadPolicy>>();
const columnCache=new WeakMap<ActorContext,Map<string,Promise<Array<{name:string}>>>>();
/** Fixed original-workspace tables only. Expansion backup belongs to operations' explicit scope. */
const related:Record<string,string>={
 opportunity_contacts:'opportunity_id IN(SELECT id FROM _legacy_rows WHERE kind=\'opportunity\') AND contact_id IN(SELECT id FROM _legacy_rows WHERE kind=\'contact\')',
 signal_links:"(record_type='company' AND record_id IN(SELECT id FROM _legacy_rows WHERE kind='company')) OR (record_type='contact' AND record_id IN(SELECT id FROM _legacy_rows WHERE kind='contact')) OR (record_type='opportunity' AND record_id IN(SELECT id FROM _legacy_rows WHERE kind='opportunity'))",
 signals:'EXISTS(SELECT 1 FROM signal_links l WHERE l.signal_id=b.id) AND NOT EXISTS(SELECT 1 FROM main.signal_links l WHERE l.signal_id=b.id AND NOT EXISTS(SELECT 1 FROM signal_links visible WHERE visible.signal_id=l.signal_id AND visible.record_type=l.record_type AND visible.record_id=l.record_id))',
 timeline_entry_records:"(record_type='company' AND record_id IN(SELECT id FROM _legacy_rows WHERE kind='company')) OR (record_type='contact' AND record_id IN(SELECT id FROM _legacy_rows WHERE kind='contact')) OR (record_type='opportunity' AND record_id IN(SELECT id FROM _legacy_rows WHERE kind='opportunity'))",
 timeline_entries:"NOT EXISTS(SELECT 1 FROM main.entry_privacy private WHERE private.source='entry' AND private.entry_id=b.id) AND EXISTS(SELECT 1 FROM timeline_entry_records t WHERE t.timeline_entry_id=b.id) AND NOT EXISTS(SELECT 1 FROM main.timeline_entry_records t WHERE t.timeline_entry_id=b.id AND NOT EXISTS(SELECT 1 FROM timeline_entry_records visible WHERE visible.timeline_entry_id=t.timeline_entry_id AND visible.record_type=t.record_type AND visible.record_id=t.record_id))",
 evaluations:'opportunity_id IN(SELECT id FROM _legacy_rows WHERE kind=\'opportunity\')',evaluation_contributions:'evaluation_id IN(SELECT id FROM evaluations) AND signal_id IN(SELECT id FROM signals)',
 recommendations:'opportunity_id IN(SELECT id FROM _legacy_rows WHERE kind=\'opportunity\')',recommendation_evidence:'recommendation_id IN(SELECT id FROM recommendations) AND signal_id IN(SELECT id FROM signals)',
 drafts:'opportunity_id IN(SELECT id FROM _legacy_rows WHERE kind=\'opportunity\') AND (recipient_contact_id IS NULL OR recipient_contact_id IN(SELECT id FROM _legacy_rows WHERE kind=\'contact\'))',
 outbound_messages:'opportunity_id IN(SELECT id FROM _legacy_rows WHERE kind=\'opportunity\') AND (contact_id IS NULL OR contact_id IN(SELECT id FROM _legacy_rows WHERE kind=\'contact\'))',
 record_aliases:"(record_type='company' AND survivor_id IN(SELECT id FROM _legacy_rows WHERE kind='company')) OR (record_type='contact' AND survivor_id IN(SELECT id FROM _legacy_rows WHERE kind='contact'))",
 record_merge_claims:"(record_type='company' AND survivor_id IN(SELECT id FROM _legacy_rows WHERE kind='company')) OR (record_type='contact' AND survivor_id IN(SELECT id FROM _legacy_rows WHERE kind='contact'))",
 record_mutation_jobs:'opportunity_id IN(SELECT id FROM _legacy_rows WHERE kind=\'opportunity\')',action_completions:'recommendation_id IN(SELECT id FROM recommendations)',
 notifications:'operator_id IN(SELECT id FROM operators) AND (opportunity_id IS NULL OR opportunity_id IN(SELECT id FROM _legacy_rows WHERE kind=\'opportunity\'))',
 audit_entries:"(entity_type='company' AND entity_id IN(SELECT id FROM _legacy_rows WHERE kind='company')) OR (entity_type='contact' AND entity_id IN(SELECT id FROM _legacy_rows WHERE kind='contact')) OR (entity_type='opportunity' AND entity_id IN(SELECT id FROM _legacy_rows WHERE kind='opportunity'))",
 ai_previews:'opportunity_id IN(SELECT id FROM _legacy_rows WHERE kind=\'opportunity\')',ai_calls:'opportunity_id IN(SELECT id FROM _legacy_rows WHERE kind=\'opportunity\')',
};
const dependencies:Record<string,string[]>={opportunity_contacts:['opportunities','contacts'],signal_links:['companies','contacts','opportunities'],signals:['signal_links'],timeline_entry_records:['companies','contacts','opportunities'],timeline_entries:['timeline_entry_records'],evaluations:['opportunities'],evaluation_contributions:['evaluations','signals'],recommendations:['opportunities'],recommendation_evidence:['recommendations','signals'],drafts:['opportunities','contacts'],outbound_messages:['opportunities','contacts'],record_aliases:['companies','contacts'],record_merge_claims:['companies','contacts'],record_mutation_jobs:['opportunities'],action_completions:['recommendations'],notifications:['operators','opportunities'],audit_entries:['companies','contacts','opportunities'],ai_previews:['opportunities'],ai_calls:['opportunities']};
export async function legacyProjection(db:D1Database,c:ActorContext,sql:string):Promise<{sql:string;bindings:SqlValue[]}>{
 if(/\b(?:access_\w+|graph_\w+|schema_\w+|domain_\w+|native_stage_audit_custody|native_erased_audit_custody|sqlite_master|sqlite_schema)\b/i.test(sql))deny('Use the explicitly scoped administration or archive API.');
 if(!/^\s*(SELECT|WITH)\b/i.test(sql))return {sql,bindings:[]};
 const tables=new Set<string>();if(/\btimeline_search\b/i.test(sql))tables.add('timeline_entries');for(const table of ['companies','contacts','opportunities','operators','sessions',...Object.keys(related)])if(new RegExp(`\\b${table}\\b`,'i').test(sql))tables.add(table);
 const add=(table:string)=>{for(const dependency of dependencies[table]??[]){if(!tables.has(dependency)){tables.add(dependency);add(dependency);}}};for(const table of [...tables])add(table);
 const literal=(value:SqlValue)=>value===null?'NULL':typeof value==='number'?String(value):`'${String(value).replaceAll("'","''")}'`;
 const inline=(fragment:{sql:string;bindings:SqlValue[]})=>{let index=0;return fragment.sql.replace(/\?/g,()=>literal(fragment.bindings[index++]));};
 if(!tables.size)return {sql,bindings:[]};const access=new AccessService(db);if(!policyCache.has(c))policyCache.set(c,graphReadPolicy(access,c));const policy=await policyCache.get(c)!,ctes:string[]=[],bindings:SqlValue[]=[];let columnsFor=columnCache.get(c);if(!columnsFor){columnsFor=new Map();columnCache.set(c,columnsFor);}
 // Evaluate the shared field policy once in the SQL text. Repeating its JSON
 // subtree rules for every native column exceeds D1's statement-size boundary.
 const nativeKinds:Record<string,string>={companies:'company',contacts:'contact',opportunities:'opportunity'};
 const nativeTables=[...tables].filter(table=>table in nativeKinds),columnCases:string[]=[];
 for(const table of nativeTables){
  if(!columnsFor.has(table))columnsFor.set(table,db.prepare(`PRAGMA table_info(${table})`).all<{name:string}>().then(result=>result.results));
  const columns=await columnsFor.get(table)!;for(const {name}of columns)if(!/^[a-z_][a-z0-9_]*$/.test(name))deny('This owner schema requires an explicit scoped adapter.');
  columnCases.push(`WHEN '${nativeKinds[table]}' THEN ${literal(JSON.stringify(columns.map(column=>column.name)))}`);
 }
 // Discover hidden paths once per candidate field. Keeping this relation at the
 // top level avoids repeating correlated JSON traversal through native joins.
 const scopedRecords=`r.workspace_id=${literal(c.workspaceId)} AND r.tenant_id=${literal(c.tenantId)} AND r.retired_into_id IS NULL`,scopedRows=`${scopedRecords} AND ${inline(policy.row)}`;
 // Relationship visibility depends on rows, so it must not recursively expand
 // projected native columns and their private-field subqueries.
 if(nativeTables.length)ctes.push(`_legacy_rows AS MATERIALIZED(${nativeTables.map(table=>`SELECT b.id,'${nativeKinds[table]}' AS kind FROM main.${table} b JOIN main.graph_records r ON r.id=b.id AND r.kind='${nativeKinds[table]}' WHERE ${scopedRows}`).join(' UNION ALL ')})`);
 ctes.push(`_legacy_candidates AS MATERIALIZED(SELECT r.id,r.kind,source.key AS field FROM main.graph_records r,json_each(r.fields_json) source WHERE ${scopedRecords}${nativeTables.length?` UNION SELECT r.id,r.kind,column_name.value AS field FROM main.graph_records r,json_each(CASE r.kind ${columnCases.join(' ')} ELSE '[]' END) column_name WHERE ${scopedRecords}`:''})`);
 ctes.push(`_legacy_privacy AS MATERIALIZED(SELECT candidate.id,candidate.kind,candidate.field,(SELECT json_group_array(hidden.path) FROM (${privatePathsSql('r','candidate.field')}) hidden) AS hidden_json FROM _legacy_candidates candidate JOIN main.graph_records r ON r.id=candidate.id AND r.kind=candidate.kind WHERE r.workspace_id=${literal(c.workspaceId)} AND r.tenant_id=${literal(c.tenantId)})`);
 const derivedTables=new Set(['signals','timeline_entries','evaluations','recommendations','drafts','outbound_messages','ai_previews','ai_calls','notifications','audit_entries']);
 if([...tables].some(table=>derivedTables.has(table))){
  const grants=(await access.grants(c)).filter(grant=>JSON.parse(grant.actions_json).some((action:string)=>action==='*'||action==='graph.*'||action==='graph.read')).map(grant=>literal(grant.id));
  const granted=grants.length?`EXISTS(SELECT 1 FROM main.access_grants grant,json_each(grant.fields_json) permission WHERE grant.id IN(${grants.join(',')}) AND grant.resource_type IN('*',r.kind) AND grant.resource_id IN('*',r.id) AND (permission.value='*' OR permission.value=hidden.value) AND grant.revoked_at IS NULL AND (grant.expires_at IS NULL OR grant.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')))`: '0';
  ctes.push(`_legacy_derivable AS MATERIALIZED(SELECT r.id,r.kind FROM main.graph_records r WHERE ${scopedRows} AND NOT EXISTS(SELECT 1 FROM _legacy_privacy privacy,json_each(privacy.hidden_json) hidden WHERE privacy.id=r.id AND privacy.kind=r.kind AND privacy.field IN(SELECT key FROM json_each(r.fields_json)) AND NOT ${granted}))`);
  ctes.push(`_legacy_derived_opportunities AS MATERIALIZED(SELECT o.id FROM main.opportunities o WHERE EXISTS(SELECT 1 FROM _legacy_derivable visible WHERE visible.id=o.id AND visible.kind='opportunity') AND (o.company_id IS NULL OR EXISTS(SELECT 1 FROM _legacy_derivable visible WHERE visible.id=o.company_id AND visible.kind='company')) AND NOT EXISTS(SELECT 1 FROM main.opportunity_contacts participant WHERE participant.opportunity_id=o.id AND NOT EXISTS(SELECT 1 FROM _legacy_derivable visible WHERE visible.id=participant.contact_id AND visible.kind='contact')) AND NOT EXISTS(SELECT 1 FROM main.signal_links own JOIN main.signal_links dependency ON dependency.signal_id=own.signal_id WHERE own.record_type='opportunity' AND own.record_id=o.id AND NOT EXISTS(SELECT 1 FROM _legacy_derivable visible WHERE visible.id=dependency.record_id AND visible.kind=dependency.record_type)))`);
 }
 if(nativeTables.length){const field=policy.field('privacy.field','SELECT value AS path FROM json_each(privacy.hidden_json)');ctes.push(`_legacy_fields AS MATERIALIZED(SELECT r.id AS record_id,r.kind,privacy.field FROM main.graph_records r JOIN _legacy_privacy privacy ON privacy.id=r.id AND privacy.kind=r.kind WHERE ${scopedRows} AND ${inline(field)})`);}
 for(const table of tables){
  if(['companies','contacts','opportunities'].includes(table)){
   if(!columnsFor.has(table))columnsFor.set(table,db.prepare(`PRAGMA table_info(${table})`).all<{name:string}>().then(result=>result.results));const columns=await columnsFor.get(table)!;const selections:string[]=[];
   for(const {name}of columns){if(!/^[a-z_][a-z0-9_]*$/.test(name))deny('This owner schema requires an explicit scoped adapter.');if(['id','created_at','updated_at'].includes(name)){selections.push(`b.${name}`);continue;}selections.push(`CASE WHEN EXISTS(SELECT 1 FROM _legacy_fields permitted WHERE permitted.record_id=b.id AND permitted.kind='${nativeKinds[table]}' AND permitted.field='${name}') THEN b.${name} ELSE NULL END AS ${name}`);}
   ctes.push(`${table} AS(SELECT ${selections.join(',')} FROM main.${table} b JOIN main.graph_records r ON r.id=b.id AND r.kind='${({companies:'company',contacts:'contact',opportunities:'opportunity'} as Record<string,string>)[table]}' WHERE r.workspace_id=? AND r.tenant_id=? AND r.retired_into_id IS NULL AND ${inline(policy.row)})`);bindings.push(c.workspaceId,c.tenantId);
  }else if(table==='operators'){ctes.push("operators AS(SELECT b.* FROM main.operators b JOIN main.access_memberships m ON m.operator_id=b.id WHERE m.workspace_id=?)");bindings.push(c.workspaceId);}
  else if(table==='sessions'){ctes.push('sessions AS(SELECT * FROM main.sessions WHERE operator_id=?)');bindings.push(c.principal.kind==='operator'?c.principal.operatorId:'');}
  else {let condition=`(${related[table]})`;
   if(['evaluations','recommendations','drafts','outbound_messages','ai_previews','ai_calls'].includes(table))condition+=' AND EXISTS(SELECT 1 FROM _legacy_derived_opportunities visible WHERE visible.id=b.opportunity_id)';
   if(table==='notifications')condition+=' AND (opportunity_id IS NULL OR EXISTS(SELECT 1 FROM _legacy_derived_opportunities visible WHERE visible.id=b.opportunity_id))';
   if(table==='audit_entries')condition+=' AND EXISTS(SELECT 1 FROM _legacy_derivable visible WHERE visible.id=b.entity_id AND visible.kind=b.entity_type)';
   if(table==='signals')condition+=" AND NOT EXISTS(SELECT 1 FROM main.signal_links dependency WHERE dependency.signal_id=b.id AND (NOT EXISTS(SELECT 1 FROM _legacy_derivable visible WHERE visible.id=dependency.record_id AND visible.kind=dependency.record_type) OR (dependency.record_type='opportunity' AND NOT EXISTS(SELECT 1 FROM _legacy_derived_opportunities visible WHERE visible.id=dependency.record_id))))";
   if(table==='timeline_entries')condition+=" AND NOT EXISTS(SELECT 1 FROM main.timeline_entry_records dependency WHERE dependency.timeline_entry_id=b.id AND (NOT EXISTS(SELECT 1 FROM _legacy_derivable visible WHERE visible.id=dependency.record_id AND visible.kind=dependency.record_type) OR (dependency.record_type='opportunity' AND NOT EXISTS(SELECT 1 FROM _legacy_derived_opportunities visible WHERE visible.id=dependency.record_id))))";
   ctes.push(`${table} AS(SELECT b.* FROM main.${table} b WHERE (${condition}))`);
  }
 }
 // Keep the native compound FTS query at the top level. Nesting its UNION
 // under id IN adds its full expression depth to the projected outer table.
 const search=sql.match(/SELECT record_id FROM record_search WHERE record_search MATCH \? AND record_type=\? UNION SELECT r.record_id FROM timeline_search s JOIN timeline_entry_records r ON r.timeline_entry_id=s.entry_id WHERE timeline_search MATCH \? AND r.record_type=\?/i);
 const lifted=search&&!sql.slice(0,search.index).includes('?')?search[0]:undefined;
 let searchSql=lifted??sql;
 // Native legacy FTS patterns are rewritten to field-level authorized matches.
 if(/\brecord_search\b/i.test(searchSql)){
  searchSql=searchSql.replace(/SELECT record_id FROM record_search WHERE record_search MATCH \? AND record_type=\?/gi,`SELECT r.id FROM main.record_search_fields JOIN main.graph_records r ON r.id=record_search_fields.record_id AND r.kind=record_search_fields.record_kind WHERE record_search_fields MATCH ? AND r.kind=? AND r.workspace_id=${literal(c.workspaceId)} AND ${inline(policy.row)} AND EXISTS(SELECT 1 FROM _legacy_fields permitted WHERE permitted.record_id=r.id AND permitted.kind=r.kind AND permitted.field=record_search_fields.field_name)`);
 }
 if(/\btimeline_search\b/i.test(searchSql))searchSql=searchSql.replace(/FROM timeline_search s\b/gi,'FROM timeline_search s JOIN timeline_entries permitted_entry ON permitted_entry.id=s.entry_id');
 if(lifted){ctes.push(`_legacy_matches(record_id) AS MATERIALIZED(${searchSql})`);sql=sql.replace(lifted,'SELECT record_id FROM _legacy_matches');}else sql=searchSql;
 const prefix=ctes.join(',');return {sql:/^\s*WITH\s+RECURSIVE\b/i.test(sql)?sql.replace(/^\s*WITH\s+RECURSIVE\b/i,`WITH RECURSIVE ${prefix},`):/^\s*WITH\b/i.test(sql)?sql.replace(/^\s*WITH\b/i,`WITH ${prefix},`):`WITH ${prefix} ${sql}`,bindings};
}
