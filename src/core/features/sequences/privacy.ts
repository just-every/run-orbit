import {mailboxPattern} from '../imports/review-erasure';
import type {Step} from './schema';

type VersionRow={sequence_id:string;version:number;name:string;steps_json:string;calendar_json:string;created_at:string;created_by:string;attributed:number};

/** Redact only authored text, preserving conditions, reference IDs and calendar semantics. */
export async function sequenceErasure(db:D1Database,mailboxes:string[],operator?:{id:string;name:string}){
 const address=mailboxPattern(mailboxes),name=operator&&operator.name.length>=3?operator.name:undefined;
 if(!address&&!name)return [];
 const word=name?new RegExp(`(?<![\\p{L}\\p{N}_@])${name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?![\\p{L}\\p{N}_@])`,'giu'):null;
 // Recorded copy lineage attributes inherited text even in another operator's private copy.
 const lineage=`WITH RECURSIVE attributed(id) AS (
  SELECT sequence_id FROM sequence_versions WHERE created_by=?
  UNION SELECT s.id FROM sequences s JOIN attributed a ON s.source_id=a.id
 )`;
 const candidates=mailboxes.flatMap(()=>['instr(lower(name),lower(?))>0','instr(lower(steps_json),lower(?))>0']);
 const values:unknown[]=[operator?.id??'',...mailboxes.flatMap(mailbox=>[mailbox,JSON.stringify(mailbox).slice(1,-1)])];
 if(name){candidates.push('(sequence_id IN attributed AND (instr(lower(name),lower(?))>0 OR instr(lower(steps_json),lower(?))>0))');values.push(name,JSON.stringify(name).slice(1,-1));}
 const selection=`${lineage} SELECT *,sequence_id IN attributed AS attributed FROM sequence_versions WHERE ${candidates.join(' OR ')} ORDER BY sequence_id,version`;
 const rows=(await db.prepare(selection).bind(...values).all<VersionRow>()).results;
 if(!rows.length)return [];
 const statements:D1PreparedStatement[]=[db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'sequence_erasure_fence',NULL
  WHERE (SELECT json_group_array(json_array(sequence_id,version,name,steps_json,calendar_json,created_at,created_by,attributed)) FROM (${selection}))<>?`)
  .bind(...values,JSON.stringify(rows.map(row=>[row.sequence_id,row.version,row.name,row.steps_json,row.calendar_json,row.created_at,row.created_by,row.attributed])))];
 for(const row of rows){
  const replacement=operator?'Erased operator':'Erased contact';
  const redact=(text:string)=>{let next=address?text.replace(address,replacement):text;if(word&&row.attributed)next=next.replace(word,replacement);return next;};
  const steps=(JSON.parse(row.steps_json) as Step[]).map(step=>step.kind==='email'&&'body' in step?{...step,subject:redact(step.subject),body:redact(step.body)}:
   'instructions' in step?{...step,title:redact(step.title),instructions:redact(step.instructions)}:step);
  const nextName=redact(row.name),nextSteps=JSON.stringify(steps);
  if(nextName===row.name&&nextSteps===row.steps_json)continue;
  // Normal UPDATE remains forbidden by the immutable-version trigger. Replace only this
  // fenced row, atomically, with identical identity, author, timestamp and calendar.
  statements.push(db.prepare('DELETE FROM sequence_versions WHERE sequence_id=? AND version=?').bind(row.sequence_id,row.version),
   db.prepare('INSERT INTO sequence_versions(sequence_id,version,name,steps_json,calendar_json,created_at,created_by) VALUES(?,?,?,?,?,?,?)')
    .bind(row.sequence_id,row.version,nextName,nextSteps,row.calendar_json,row.created_at,row.created_by));
 }
 return statements;
}
