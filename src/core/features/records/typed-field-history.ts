import {z} from 'zod';
import {RecordError} from './shared';

const querySchema=z.object({
 kind:z.enum(['contact','company','opportunity']),
 fieldKey:z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),
 beforeRevision:z.coerce.number().int().positive().safe().optional()
}).strict();

/** Definition revisions contain schema meaning, never customer field values. Each names who saved it from the audit row
 * its confirm wrote in the same batch at the same instant, and carries the revision before it so the change can be told. */
export async function typedFieldHistory(db:D1Database,query:Record<string,string>){
 const parsed=querySchema.safeParse(query);
 if(!parsed.success)throw new RecordError(400,'Choose a record type, field key and valid history cursor.');
 const {kind,fieldKey,beforeRevision}=parsed.data;
 const field=await db.prepare('SELECT label,archived,revision FROM record_custom_fields WHERE kind=? AND field_key=?').bind(kind,fieldKey).first<{label:string;archived:number;revision:number}>();
 if(!field)throw new RecordError(404,'Custom field not found.');
 const rows=(await db.prepare(`SELECT h.revision,h.definition_json,p.definition_json AS previous_json,h.changed_at,(SELECT o.display_name FROM audit_entries a JOIN operators o ON o.id=a.actor_id WHERE a.entity_type='installation' AND a.entity_id='workspace' AND a.occurred_at=h.changed_at AND a.action='custom-field.configured' AND json_extract(a.details_json,'$.kind')=h.kind AND json_extract(a.details_json,'$.field')=h.field_key LIMIT 1) AS changed_by FROM record_custom_field_history h LEFT JOIN record_custom_field_history p ON p.kind=h.kind AND p.field_key=h.field_key AND p.revision=h.revision-1 WHERE h.kind=? AND h.field_key=?${beforeRevision===undefined?'':' AND h.revision<?'} ORDER BY h.revision DESC LIMIT 51`).bind(kind,fieldKey,...(beforeRevision===undefined?[]:[beforeRevision])).all<{revision:number;definition_json:string;previous_json:string|null;changed_at:string;changed_by:string|null}>()).results;
 const page=rows.slice(0,50);
 return {field:{kind,fieldKey,...field},revisions:page.map(row=>({revision:row.revision,definition:JSON.parse(row.definition_json),previous:row.previous_json===null?null:JSON.parse(row.previous_json),changedAt:row.changed_at,changedBy:row.changed_by})),nextBeforeRevision:rows.length>50?page.at(-1)!.revision:null};
}
