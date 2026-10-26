import {z} from 'zod';
import {RecordError} from './shared';

const querySchema=z.object({
 kind:z.enum(['contact','company','opportunity']),
 fieldKey:z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),
 beforeRevision:z.coerce.number().int().positive().safe().optional()
}).strict();

/** Definition revisions contain schema meaning, never customer field values. */
export async function typedFieldHistory(db:D1Database,query:Record<string,string>){
 const parsed=querySchema.safeParse(query);
 if(!parsed.success)throw new RecordError(400,'Choose a record type, field key and valid history cursor.');
 const {kind,fieldKey,beforeRevision}=parsed.data;
 const field=await db.prepare('SELECT label,archived,revision FROM record_custom_fields WHERE kind=? AND field_key=?').bind(kind,fieldKey).first<{label:string;archived:number;revision:number}>();
 if(!field)throw new RecordError(404,'Custom field not found.');
 const rows=(await db.prepare(`SELECT revision,definition_json,changed_at FROM record_custom_field_history WHERE kind=? AND field_key=?${beforeRevision===undefined?'':' AND revision<?'} ORDER BY revision DESC LIMIT 51`).bind(kind,fieldKey,...(beforeRevision===undefined?[]:[beforeRevision])).all<{revision:number;definition_json:string;changed_at:string}>()).results;
 const page=rows.slice(0,50);
 return {field:{kind,fieldKey,...field},revisions:page.map(row=>({revision:row.revision,definition:JSON.parse(row.definition_json),changedAt:row.changed_at})),nextBeforeRevision:rows.length>50?page.at(-1)!.revision:null};
}
