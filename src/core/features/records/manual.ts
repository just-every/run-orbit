import { createId } from '../../shared/ids';
import { audit, RecordError, requireRecord, type RecordKind } from './shared';
import { mentionPlan, withdrawMentions } from './mentions';
const labels={note:'note',call:'call log',meeting:'meeting log'} as const;
export class ManualRepository {
 constructor(readonly db:D1Database){}
 async save(kind:RecordKind,recordId:string,input:{kind:'note'|'call'|'meeting';text:string;occurredAt:string;durationMinutes?:number;contactIds?:string[]},actor:string,id?:string,plan?:{meetingSignalId:string;agenda:string;prep:string}){
  await requireRecord(this.db,kind,recordId);if(!input.text.trim()||!Number.isFinite(Date.parse(input.occurredAt))||Date.parse(input.occurredAt)>Date.now())throw new RecordError(400,'Enter text and a valid occurred time no later than now.');
  if(input.kind!=='note'&&(!Number.isInteger(input.durationMinutes)||input.durationMinutes!<0))throw new RecordError(400,'Enter the duration in minutes.');
  for(const contact of input.contactIds??[])await requireRecord(this.db,'contact',contact);
  const current=id?await this.db.prepare("SELECT t.payload_json,t.source FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE t.id=? AND t.kind IN ('manual.note','manual.call','manual.meeting') AND r.record_type=? AND r.record_id=?").bind(id,kind,recordId).first<{payload_json:string;source:string}>():null;
  if(current?.source==='twilio')throw new RecordError(409,'Provider call receipts cannot be edited. Add a separate note.');
  if(id&&!current)throw new RecordError(404,'Manual entry not found.');
  // A meeting plan saved as a note keeps its plan fields when the note is edited from the timeline.
  plan??=current?(JSON.parse(current.payload_json) as {plan?:{meetingSignalId:string;agenda:string;prep:string}}).plan:undefined;
  const existing=!!id;id??=createId();
  // RECORD-017: mentions are internal, saved with the entry so they export and erase with it.
  const mentions=await mentionPlan(this.db,{source:'entry',sourceId:id,kind,recordId,label:labels[input.kind],text:input.text,author:actor});
  const payload=JSON.stringify({text:input.text,durationMinutes:input.durationMinutes??null,contactIds:input.contactIds??[],...(mentions.mentions.length?{mentions:mentions.mentions}:{}),...(plan?{plan}:{})}),now=new Date().toISOString();
  await this.db.batch([...mentions.statements,existing?this.db.prepare('UPDATE timeline_entries SET kind=?,occurred_at=?,payload_json=? WHERE id=?').bind(`manual.${input.kind}`,input.occurredAt,payload,id):this.db.prepare("INSERT INTO timeline_entries VALUES(?,?,?,?,'operator',?,'manual',?)").bind(id,`manual.${input.kind}`,input.occurredAt,now,actor,payload),...(!existing?[this.db.prepare('INSERT INTO timeline_entry_records VALUES(?,?,?)').bind(id,kind,recordId)]:[]),audit(this.db,actor,existing?'manual.updated':'manual.created',kind,recordId,{entryId:id})]);return {id,mentions:mentions.mentions};
 }
 async remove(kind:RecordKind,recordId:string,id:string,actor:string){const result=await this.db.prepare("SELECT t.id,t.kind FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE t.id=? AND t.kind IN ('manual.note','manual.call','manual.meeting') AND r.record_type=? AND r.record_id=?").bind(id,kind,recordId).first<{id:string;kind:string}>();if(!result)throw new RecordError(404,'Manual entry not found.');
  // The deletion stays on the timeline, attributed, and withdraws the entry's unread mention notifications (RECORD-017).
  const now=new Date().toISOString(),trace=createId();
  await this.db.batch([this.db.prepare('DELETE FROM timeline_entries WHERE id=?').bind(id),withdrawMentions(this.db,'entry',id),this.db.prepare("INSERT INTO timeline_entries VALUES(?,'entry.deleted',?,?,'operator',?,'manual',?)").bind(trace,now,now,actor,JSON.stringify({entryId:id,kind:result.kind.replace('manual.','')})),this.db.prepare('INSERT INTO timeline_entry_records VALUES(?,?,?)').bind(trace,kind,recordId),audit(this.db,actor,'manual.deleted',kind,recordId,{entryId:id})]);return {id};}
}
