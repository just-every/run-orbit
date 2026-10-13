import { createId } from '../../shared/ids';
import { audit, RecordError, requireRecord, type RecordKind } from './shared';
export class ManualRepository {
 constructor(readonly db:D1Database){}
 async save(kind:RecordKind,recordId:string,input:{kind:'note'|'call'|'meeting';text:string;occurredAt:string;durationMinutes?:number;contactIds?:string[]},actor:string,id?:string){
  await requireRecord(this.db,kind,recordId);if(!input.text.trim()||!Number.isFinite(Date.parse(input.occurredAt))||Date.parse(input.occurredAt)>Date.now())throw new RecordError(400,'Enter text and a valid occurred time no later than now.');
  if(input.kind!=='note'&&(!Number.isInteger(input.durationMinutes)||input.durationMinutes!<0))throw new RecordError(400,'Enter the duration in minutes.');
  for(const contact of input.contactIds??[])await requireRecord(this.db,'contact',contact);
  if(id&&!await this.db.prepare("SELECT t.id FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE t.id=? AND t.kind IN ('manual.note','manual.call','manual.meeting') AND r.record_type=? AND r.record_id=?").bind(id,kind,recordId).first())throw new RecordError(404,'Manual entry not found.');
  const payload=JSON.stringify({text:input.text,durationMinutes:input.durationMinutes??null,contactIds:input.contactIds??[]}),now=new Date().toISOString(),existing=!!id;id??=createId();
  await this.db.batch([existing?this.db.prepare('UPDATE timeline_entries SET kind=?,occurred_at=?,payload_json=? WHERE id=?').bind(`manual.${input.kind}`,input.occurredAt,payload,id):this.db.prepare("INSERT INTO timeline_entries VALUES(?,?,?,?,'operator',?,'manual',?)").bind(id,`manual.${input.kind}`,input.occurredAt,now,actor,payload),...(!existing?[this.db.prepare('INSERT INTO timeline_entry_records VALUES(?,?,?)').bind(id,kind,recordId)]:[]),audit(this.db,actor,existing?'manual.updated':'manual.created',kind,recordId,{entryId:id})]);return {id};
 }
 async remove(kind:RecordKind,recordId:string,id:string,actor:string){const result=await this.db.prepare("SELECT t.id FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE t.id=? AND t.kind IN ('manual.note','manual.call','manual.meeting') AND r.record_type=? AND r.record_id=?").bind(id,kind,recordId).first();if(!result)throw new RecordError(404,'Manual entry not found.');await this.db.batch([this.db.prepare('DELETE FROM timeline_entries WHERE id=?').bind(id),audit(this.db,actor,'manual.deleted',kind,recordId,{entryId:id})]);return {id};}
}
