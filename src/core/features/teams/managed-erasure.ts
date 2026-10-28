import {identityMatch,identityPatterns} from '../records/erasure-identity';

/** Native erasure removes mailbox copies from typed records without dropping unrelated fields. */
export async function managedValueErasure(db:D1Database,mailboxes:string[],replacement:string){
 const statements:D1PreparedStatement[]=[],identities=[...new Set(mailboxes.filter(Boolean))];
 if(!identities.length)return statements;
 const addresses=identities.map(mailbox=>{
  const quote=mailbox.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return new RegExp(`(^|[^a-z0-9.!#$%&'*+/=?^_\x60{|}~@-])${quote}(?=$|[^a-z0-9_@.-]|\\.(?![a-z0-9_@.-]))`,'gi');
 });
 let after='';
  for(;;){
   const rows=(await db.prepare(`SELECT id,fields_json,revision FROM managed_records WHERE id>? AND EXISTS(SELECT 1 FROM json_each(fields_json) field WHERE field.type='text' AND (${identities.map(()=>identityMatch('field.value')).join(' OR ')})) ORDER BY id LIMIT 100`).bind(after,...identities.flatMap(identityPatterns)).all<{id:string;fields_json:string;revision:number}>()).results;
   for(const row of rows){
    const next=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(row.fields_json)).map(([key,value])=>[key,typeof value==='string'?addresses.reduce((current,address)=>current.replace(address,(_match,before:string)=>before+replacement),value):value])));
    if(next===row.fields_json)continue;
    statements.push(db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'managed_erasure_fence',NULL WHERE NOT EXISTS(SELECT 1 FROM managed_records WHERE id=? AND fields_json=? AND revision=?)").bind(row.id,row.fields_json,row.revision),db.prepare('UPDATE managed_records SET fields_json=?,revision=revision+1,updated_at=? WHERE id=?').bind(next,new Date().toISOString(),row.id));
   }
   if(rows.length<100)break;after=rows.at(-1)!.id;
  }
 return statements;
}
