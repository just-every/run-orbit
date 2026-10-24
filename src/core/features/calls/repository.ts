import {guard,clearGuards,refused} from '../identity/store';
import {createId} from '../../shared/ids';
import {audit,RecordError} from '../records/shared';
import {payloadHash} from '../../platform/source-security';
import type {SourceSecurity} from '../../platform/source-security';
import {normalizedPhone} from './provider';
export interface CallCredentials {accountSid:string;token:string;from:string;operatorPhone:string;origin:string}
export class CallsRepository {
 constructor(readonly db:D1Database,readonly security?:SourceSecurity){}
 async requireOwner(actor:string){if(!await this.db.prepare("SELECT 1 FROM operators WHERE id=? AND setup_owner=1 AND status='active'").bind(actor).first())throw new RecordError(403,'Only the installation owner configures calling or reviews unknown numbers.');}
 async credentials():Promise<CallCredentials|null>{const row=await this.db.prepare('SELECT ciphertext FROM call_credentials WHERE id=1').first<{ciphertext:string}>();if(!row)return null;if(!this.security)throw new Error('Calling needs the installation encryption key.');return JSON.parse(await this.security.open(row.ciphertext));}
 async configure(input:CallCredentials,actor:string){await this.requireOwner(actor);if(!this.security)throw new Error('Calling needs the installation encryption key.');await this.db.batch([this.db.prepare('INSERT INTO call_credentials VALUES(1,?) ON CONFLICT(id) DO UPDATE SET ciphertext=excluded.ciphertext').bind(await this.security.seal(JSON.stringify(input))),audit(this.db,actor,'calls.configured','installation','workspace',{accountSid:input.accountSid,from:input.from})]);}
 async status(actor:string){await this.requireOwner(actor);const credentials=await this.credentials();return {configured:!!credentials,from:credentials?.from??null,operatorPhone:credentials?.operatorPhone??null,callback:credentials?`${credentials.origin}/api/v1/calls/twilio/events`:null,held:(await this.db.prepare('SELECT id,from_number,to_number,direction,status,received_at FROM call_events e WHERE contact_id IS NULL AND NOT EXISTS(SELECT 1 FROM call_events newer WHERE newer.account_sid=e.account_sid AND newer.call_sid=e.call_sid AND newer.sequence>e.sequence) ORDER BY received_at DESC LIMIT 100').all()).results};}
 async contactFor(phone:string){const rows=(await this.db.prepare('SELECT id,phone FROM contacts WHERE phone IS NOT NULL').all<{id:string;phone:string}>()).results.filter(c=>normalizedPhone(c.phone)===phone);return rows.length===1?rows[0]!.id:null;}
 async receive(form:URLSearchParams){
  const customerNumber=form.get('Direction')!.startsWith('inbound')?form.get('From')!:form.get('To')!;
  if(await this.db.prepare('SELECT 1 FROM call_erased_numbers WHERE phone_hash=?').bind(await payloadHash(normalizedPhone(customerNumber))).first())return {replay:true};
  const account=form.get('AccountSid')!,sid=form.get('CallSid')!,sequence=Number(form.get('SequenceNumber')??'0');
  if(await this.db.prepare('SELECT 1 FROM call_events WHERE account_sid=? AND call_sid=? AND sequence=?').bind(account,sid,sequence).first())return {replay:true};
  const from=form.get('From')!,to=form.get('To')!,direction=form.get('Direction')!,status=form.get('CallStatus')!,duration=form.get('CallDuration');
  const prior=await this.db.prepare('SELECT entry_id,contact_id,sequence FROM call_events WHERE account_sid=? AND call_sid=? ORDER BY sequence DESC LIMIT 1').bind(account,sid).first<{entry_id:string|null;contact_id:string|null;sequence:number}>();
  const customer=direction.startsWith('inbound')?from:to,contact=prior?prior.contact_id:await this.contactFor(customer),id=createId(),entry=prior?.entry_id??(contact?(await payloadHash(`${account}:${sid}`)).slice(0,26).toUpperCase():null),now=new Date().toISOString();
  const payload=JSON.stringify({text:`Twilio ${direction} call: ${status}`,durationMinutes:duration===null?null:Number(duration)/60,callSid:sid,sequence,from,to});
  // One batch owns receipt and timeline. Out-of-order callbacks never regress the visible status.
  try{await this.db.batch([this.db.prepare('INSERT INTO call_events VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,account,sid,sequence,contact,from,to,direction,status,duration===null?null:Number(duration),now,null),...(contact&&entry?[
   this.db.prepare("INSERT INTO timeline_entries VALUES(?,'manual.call',?,?,'provider',NULL,'twilio',?) ON CONFLICT(id) DO UPDATE SET payload_json=excluded.payload_json WHERE json_extract(timeline_entries.payload_json,'$.sequence')<json_extract(excluded.payload_json,'$.sequence')").bind(entry,now,now,payload),
   this.db.prepare('INSERT OR IGNORE INTO timeline_entry_records VALUES(?,?,?)').bind(entry,'contact',contact),
   this.db.prepare('UPDATE call_events SET entry_id=? WHERE id=?').bind(entry,id)]:[])]);}catch(error){if(await this.db.prepare('SELECT 1 FROM call_events WHERE account_sid=? AND call_sid=? AND sequence=?').bind(account,sid,sequence).first())return {replay:true};throw error;}
  return {replay:false,held:!contact};
 }
 async review(id:string,contactId:string,actor:string){
  await this.requireOwner(actor);
  const selected=await this.db.prepare('SELECT account_sid,call_sid FROM call_events WHERE id=? AND contact_id IS NULL').bind(id).first<{account_sid:string;call_sid:string}>();
  if(!selected)throw new RecordError(404,'Held call not found.');
  if(!await this.db.prepare('SELECT 1 FROM contacts WHERE id=?').bind(contactId).first())throw new RecordError(404,'Contact not found.');
  const row=(await this.db.prepare('SELECT * FROM call_events WHERE account_sid=? AND call_sid=? ORDER BY sequence DESC LIMIT 1').bind(selected.account_sid,selected.call_sid).first<Record<string,any>>())!;
  const entry=(await payloadHash(`${selected.account_sid}:${selected.call_sid}`)).slice(0,26).toUpperCase(),payload=JSON.stringify({text:`Twilio ${row.direction} call: ${row.status}`,callSid:row.call_sid,sequence:row.sequence,from:row.from_number,to:row.to_number,durationMinutes:row.duration_seconds===null?null:row.duration_seconds/60});
  try{await this.db.batch([
   guard(this.db,{sql:'EXISTS(SELECT 1 FROM call_events WHERE id=? AND contact_id IS NULL) AND NOT EXISTS(SELECT 1 FROM call_events WHERE account_sid=? AND call_sid=? AND sequence>?)',args:[id,selected.account_sid,selected.call_sid,row.sequence]}),
   this.db.prepare("INSERT INTO timeline_entries VALUES(?,'manual.call',?,?,'operator',?,'twilio',?)").bind(entry,row.received_at,new Date().toISOString(),actor,payload),
   this.db.prepare('INSERT INTO timeline_entry_records VALUES(?,?,?)').bind(entry,'contact',contactId),
   this.db.prepare('UPDATE call_events SET contact_id=?,entry_id=? WHERE account_sid=? AND call_sid=? AND contact_id IS NULL').bind(contactId,entry,selected.account_sid,selected.call_sid),
   audit(this.db,actor,'calls.matched','contact',contactId,{receipt:id}),clearGuards(this.db)
  ]);}catch(error){if(refused(error))throw new RecordError(409,'This call changed. Reload before reviewing it.');throw error;}
  return {linked:true};
 }
}
