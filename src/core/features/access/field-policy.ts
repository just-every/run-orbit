/** Privacy is shared by direct authorization, SQL projection and derived records. */
const privateMarkers=['private','secret','credential','token','mail_body','internal'];
const privateLevels=['private','restricted','internal'];
const privateName=new RegExp(`(^|[._])(${privateMarkers.join('|')})([._]|$)`,'i');
export const privateField=(field:string)=>privateName.test(field);
export const canonicalField=(field:string)=>field==='email_key'?'email':field==='primary_domain_key'?'primary_domain':field;
export const sensitiveLevel=(value:unknown)=>typeof value==='string'&&privateLevels.includes(value.toLowerCase());
export function privateNameSql(expression:string){return `EXISTS(SELECT 1 FROM json_each('${JSON.stringify(privateMarkers)}') privacy_marker,json_each('[".","_"]') privacy_left,json_each('[".","_"]') privacy_right WHERE instr('.'||lower(${expression})||'.',privacy_left.value||privacy_marker.value||privacy_right.value)>0)`;}
const canonicalSql=(expression:string)=>`(CASE ${expression} WHEN 'email_key' THEN 'email' WHEN 'primary_domain_key' THEN 'primary_domain' ELSE ${expression} END)`;
const sensitivitySql=(definition:string)=>`lower(json_extract(${definition},'$.sensitivity')) IN (${privateLevels.map(level=>`'${level}'`).join(',')})`;
const descendantSql=(path:string,parent:string)=>`substr(${path},1,length(${parent})+1)=${parent}||'.'`;

/** Every row is an independent private path needing an explicit field grant.
 * A parent grant is deliberately not a grant to the hidden paths beneath it. */
export function privatePathsSql(alias:string,expression:string){
 const field='privacy_field.name',schema='FROM privacy_schema definition';
 const suffix="replace(replace(replace(substr(child.fullkey,2),'\"',''),'[','.'),']','')",childPath=`${field}||${suffix}`;
 // Materialize each small per-field input so SQLite cannot expand nested native
 // projections into expressions beyond D1's depth limit.
 const inputs=`WITH privacy_field AS MATERIALIZED(SELECT ${canonicalSql(expression)} AS name),
 privacy_value AS MATERIALIZED(SELECT source.value FROM json_each(${alias}.fields_json) source WHERE source.key=(SELECT name FROM privacy_field)),
 privacy_tree AS MATERIALIZED(SELECT tree.* FROM privacy_value,json_tree(CASE WHEN json_valid(privacy_value.value) THEN privacy_value.value ELSE 'null' END) tree),
 privacy_schema AS MATERIALIZED(SELECT definition.key,definition.value FROM main.schema_types st,json_each(st.fields_json) definition WHERE st.workspace_id=${alias}.workspace_id AND st.name=${alias}.kind)`;
 // Dotted/escaped JSON keys are not the same paths as nested ordinary keys.
 const ambiguous=`EXISTS(SELECT 1 FROM privacy_tree ancestor WHERE ancestor.key IS NOT NULL AND substr(child.fullkey,1,length(ancestor.fullkey))=ancestor.fullkey AND CAST(ancestor.key AS TEXT) GLOB '*[^a-zA-Z0-9_]*')`;
 return `${inputs}
 SELECT ${field} AS path FROM privacy_field WHERE ${privateNameSql(field)} OR EXISTS(SELECT 1 ${schema} WHERE (${field}=definition.key OR ${descendantSql(field,'definition.key')}) AND ${sensitivitySql('definition.value')})
 UNION SELECT definition.key AS path FROM privacy_schema definition,privacy_field WHERE ${descendantSql('definition.key',field)} AND (${sensitivitySql('definition.value')} OR ${privateNameSql('definition.key')})
 UNION SELECT CASE WHEN ${ambiguous} THEN NULL ELSE ${childPath} END AS path FROM privacy_tree child,privacy_field WHERE child.parent IS NOT NULL AND (${privateNameSql('CAST(child.key AS TEXT)')} OR (${ambiguous} AND EXISTS(SELECT 1 ${schema} WHERE (definition.key=${childPath} OR ${descendantSql('definition.key',childPath)}) AND (${sensitivitySql('definition.value')} OR ${privateNameSql('definition.key')}))))`;
}

export function privatePaths(field:string,definitions:Record<string,{sensitivity?:string}>,record:Record<string,unknown>):Array<string|null>{
 const canonical=canonicalField(field),paths=new Set<string|null>();
 if(privateField(canonical)||Object.entries(definitions).some(([key,d])=>(key===canonical||canonical.startsWith(key+'.'))&&sensitiveLevel(d.sensitivity)))paths.add(canonical);
 for(const [key,d]of Object.entries(definitions))if(key.startsWith(canonical+'.')&&(privateField(key)||sensitiveLevel(d.sensitivity)))paths.add(key);
 let value=record[canonical];if(typeof value==='string'){try{value=JSON.parse(value);}catch{value=null;}}
 const visit=(value:unknown,path:string,ambiguous=false)=>{if(!value||typeof value!=='object')return;for(const [key,child]of Object.entries(value)){const childPath=path+'.'+key,uncertain=ambiguous||!/^[a-zA-Z0-9_]+$/.test(key);if(privateField(key))paths.add(uncertain?null:childPath);if(uncertain&&Object.entries(definitions).some(([defined,d])=>(defined===childPath||defined.startsWith(childPath+'.'))&&(privateField(defined)||sensitiveLevel(d.sensitivity))))paths.add(null);visit(child,childPath,uncertain);}};
 visit(value,canonical);return[...paths];
}
export function coversPrivatePath(pattern:string,path:string|null){return pattern==='*'||path!==null&&pattern===path;}
