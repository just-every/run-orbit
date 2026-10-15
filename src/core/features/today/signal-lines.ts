import type {BriefLine,RecordRef} from './types';
import {planHref} from './links';
import {customerSignalSql} from '../signals/test-events';

/** A line before its records are resolved: signal lines link to the timeline entry the signal made on a record.
 * A held line carries the records its capture proposal names; its detail names only those the reader may see. */
export type RawLine=Omit<BriefLine,'href'>&{link:{fixed:string}|{entries:{entryId:string;ref:RecordRef}[]};proposed?:{ref:RecordRef;name:string}[]};

const label=(type:string)=>type.replaceAll(/[._:-]+/g,' ').replace(/^./,letter=>letter.toUpperCase());
const meetingTypes=new Set(['meeting.booked','meeting.cancelled','meeting.completed']);

export async function signalEntries(db:D1Database,signalIds:string[]){
 const rows=await db.prepare("SELECT t.id AS entryId,json_extract(t.payload_json,'$.signalId') AS signalId,r.record_type AS type,r.record_id AS id FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE t.kind='signal.recorded' AND json_extract(t.payload_json,'$.signalId') IN (SELECT value FROM json_each(?))").bind(JSON.stringify(signalIds)).all<{entryId:string;signalId:string;type:RecordRef['type'];id:string}>();
 const entries=new Map<string,{entryId:string;ref:RecordRef}[]>();
 for(const row of rows.results)entries.set(row.signalId,[...entries.get(row.signalId)??[],{entryId:row.entryId,ref:{type:row.type,id:row.id}}]);
 return entries;
}

export async function signalLinks(db:D1Database,signalIds:string[]){
 const rows=await db.prepare('SELECT signal_id AS signalId,record_type AS type,record_id AS id FROM signal_links WHERE signal_id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(signalIds)).all<{signalId:string;type:RecordRef['type'];id:string}>();
 const links=new Map<string,RecordRef[]>();
 for(const row of rows.results)links.set(row.signalId,[...links.get(row.signalId)??[],{type:row.type,id:row.id}]);
 return links;
}

/** Customer signals linked to a record since the window opened: replies, meetings, then observed and inferred activity. */
export async function newSignalLines(db:D1Database,since:string,limit:number):Promise<{lines:RawLine[];truncated:boolean}>{
 const rows=(await db.prepare(`SELECT s.id,s.type,s.subject,s.occurred_at AS occurredAt,s.confidence,ss.name AS sourceName FROM signals s JOIN signal_sources ss ON ss.id=s.source_id WHERE s.type<>'email.sent' AND ${customerSignalSql()} AND EXISTS(SELECT 1 FROM signal_links l WHERE l.signal_id=s.id AND l.linked_at>=?) ORDER BY s.occurred_at DESC,s.id LIMIT ?`).bind(since,limit+1).all<{id:string;type:string;subject:string|null;occurredAt:string;confidence:'observed'|'inferred';sourceName:string}>()).results;
 const kept=rows.slice(0,limit),ids=kept.map(row=>row.id),[links,entries]=await Promise.all([signalLinks(db,ids),signalEntries(db,ids)]);
 return {truncated:rows.length>limit,lines:kept.map(row=>({
  id:`signal:${row.id}`,kind:row.type==='email.replied'?'reply':meetingTypes.has(row.type)?'meeting':'signal',group:'new',signalType:row.type,confidence:row.confidence,
  title:row.subject||label(row.type),detail:`From ${row.sourceName.replace(/\s*\([^)]*\)$/,'')}`,occurredAt:row.occurredAt,dueAt:null,
  evidence:{type:'signal',id:row.id},records:links.get(row.id)??[],planHref:row.type==='meeting.booked'?planHref(row.id):null,
  link:{entries:entries.get(row.id)??[]}}))};
}
