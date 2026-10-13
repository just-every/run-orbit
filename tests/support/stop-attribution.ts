import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { payloadHash } from '../../src/core/platform/source-security';
import type { SignalEvent } from '../../src/core/features/ingestion/contracts';

// Compare private state without including sessions or matching keys in test output.
export async function databaseDigest(db:D1Database){
 const tables=(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name").all<{name:string}>()).results;
 const digest=createHash('sha256');
 for(const {name} of tables){
  assert.match(name,/^[a-zA-Z0-9_]+$/);
  const rows=(await db.prepare(`SELECT * FROM "${name}"`).all()).results;
  digest.update(name);digest.update(JSON.stringify(rows.map(row=>JSON.stringify(row)).sort()));
 }
 return digest.digest('hex');
}

export async function assertAttribution(db:D1Database,id:string,event:SignalEvent,source:string,expected:Array<{type:string;id:string}>,basis:string,actor=source){
 const signal=(await db.prepare('SELECT source_id,source_event_id,type,subject,occurred_at,received_at,created_at,payload_json,payload_hash,linking_basis FROM signals WHERE id=?').bind(id).first())!;
 assert.ok(signal);
 assert.equal(signal.source_id,source);assert.equal(signal.source_event_id,event.eventId);
 assert.equal(signal.type,event.type);assert.equal(signal.subject,event.subject);assert.equal(signal.occurred_at,event.occurredAt);
 assert.equal(signal.payload_json,JSON.stringify(event));assert.equal(signal.payload_hash,await payloadHash(JSON.stringify(event)));
 assert.equal(signal.created_at,signal.received_at);assert.equal(signal.linking_basis,basis);
 const rows=expected.map(row=>({record_type:row.type,record_id:row.id})).sort((a,b)=>a.record_type.localeCompare(b.record_type)||a.record_id.localeCompare(b.record_id));
 for(const [table,column] of [['signal_links','signal_id'],['timeline_entry_records','timeline_entry_id']]){
  assert.deepEqual((await db.prepare(`SELECT record_type,record_id FROM ${table} WHERE ${column}=? ORDER BY record_type,record_id`).bind(id).all()).results,rows);
 }
 const entry=await db.prepare('SELECT actor_type,actor_id,source,occurred_at,recorded_at FROM timeline_entries WHERE id=?').bind(id).first();
 if(!expected.length){assert.equal(entry,null);return;}
 assert.ok(entry);assert.equal(entry.actor_type,actor===source?'source':'operator');assert.equal(entry.actor_id,actor);
 assert.equal(entry.source,actor===source?source:'operator.review');assert.equal(entry.occurred_at,event.occurredAt);
 if(actor===source)assert.equal(entry.recorded_at,signal.received_at);
 const links=(await db.prepare('SELECT linking_basis FROM signal_links WHERE signal_id=?').bind(id).all()).results;
 assert.ok(links.every(link=>link.linking_basis===(actor===source?basis:'Operator reviewed record link')));
}
