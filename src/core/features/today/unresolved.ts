import type {RawLine} from './signal-lines';
import {handoffEvidence} from '../delegation/evidence';

/** Handoffs an application proposed that no person has accepted, edited or dismissed yet. */
export async function proposalLines(db:D1Database,limit:number):Promise<RawLine[]>{
 const rows=await db.prepare("SELECT h.id,h.title,h.updated_at AS updatedAt,h.due_at AS dueAt,h.opportunity_id AS opportunityId,h.source_client_id AS clientId FROM handoff_tasks h JOIN opportunities o ON o.id=h.opportunity_id WHERE h.source_client_id IS NOT NULL AND h.status='open' ORDER BY h.updated_at DESC LIMIT ?").bind(limit).all<{id:string;title:string;updatedAt:string;dueAt:string|null;opportunityId:string;clientId:string}>();
 const cited=await Promise.all(rows.results.map(row=>handoffEvidence(db,row.id)));
 return rows.results.map((row,index)=>({id:`handoff-proposed:${row.id}`,kind:'handoff-proposed',group:'proposal',signalType:null,confidence:null,title:row.title,detail:`Proposed by ${row.clientId}; ${cited[index]!.length?`cites ${cited[index]!.length} evidence item${cited[index]!.length===1?'':'s'}`:'cites no evidence'}; accept, edit or dismiss`,occurredAt:row.updatedAt,dueAt:row.dueAt,evidence:{type:'handoff',id:row.id},records:[{type:'opportunity',id:row.opportunityId}],planHref:null,link:{fixed:`/app/opportunities/${row.opportunityId}#handoff-${row.id}`}}));
}

/** Evidence that matched no record: held signals and replies without thread headers. Shown, never guessed. */
export async function unresolvedLines(db:D1Database,limit:number):Promise<RawLine[]>{
 const [signals,replies]=await Promise.all([
  db.prepare('SELECT s.id,s.type,s.subject,s.occurred_at AS occurredAt,s.confidence,u.reason FROM unlinked_signals u JOIN signals s ON s.id=u.signal_id WHERE u.resolved_at IS NULL ORDER BY s.occurred_at DESC,s.id LIMIT ?').bind(limit).all<{id:string;type:string;subject:string|null;occurredAt:string;confidence:'observed'|'inferred';reason:string}>(),
  db.prepare('SELECT id,sender,subject,occurred_at AS occurredAt FROM unlinked_replies WHERE opportunity_id IS NULL ORDER BY occurred_at DESC LIMIT ?').bind(limit).all<{id:string;sender:string;subject:string;occurredAt:string}>()]);
 return [
  ...signals.results.map((row):RawLine=>({id:`unlinked-signal:${row.id}`,kind:'unlinked-signal',group:'unresolved',signalType:row.type,confidence:row.confidence,title:row.subject||row.type,detail:row.reason,occurredAt:row.occurredAt,dueAt:null,evidence:{type:'signal',id:row.id},records:[],planHref:null,link:{fixed:`/app/sources#unlinked-${row.id}`}})),
  ...replies.results.map((row):RawLine=>({id:`unlinked-reply:${row.id}`,kind:'unlinked-reply',group:'unresolved',signalType:'email.replied',confidence:'observed',title:row.subject,detail:`Reply from ${row.sender} without thread headers`,occurredAt:row.occurredAt,dueAt:null,evidence:{type:'unlinked-reply',id:row.id},records:[],planHref:null,link:{fixed:`/app/sources#reply-${row.id}`}}))];
}

/** Captured replies and meetings held until a person accepts or declines the link capture proposed (capture links only Orbit-threaded mail by itself). */
export async function heldLines(db:D1Database,limit:number):Promise<RawLine[]>{
 const rows=(await db.prepare(`SELECT s.id,s.type,s.subject,s.occurred_at AS occurredAt,s.confidence,p.id AS proposalId,json_extract(p.details_json,'$.names') AS names FROM capture_proposals p JOIN signals s ON s.id=p.signal_id
  WHERE p.kind='link_signal' AND p.status='pending' AND NOT EXISTS(SELECT 1 FROM signal_links l WHERE l.signal_id=s.id) AND NOT EXISTS(SELECT 1 FROM unlinked_signals u WHERE u.signal_id=s.id AND u.resolved_at IS NULL)
  ORDER BY s.occurred_at DESC,s.id,p.id LIMIT ?`).bind(limit).all<{id:string;type:string;subject:string|null;occurredAt:string;confidence:'observed'|'inferred';proposalId:string;names:string|null}>()).results;
 const seen=new Set<string>();
 return rows.filter(row=>!seen.has(row.id)&&Boolean(seen.add(row.id))).map((row):RawLine=>{const names=(JSON.parse(row.names??'[]') as string[]).join(', ');
  return {id:`held-capture:${row.id}`,kind:'held-capture',group:'held',signalType:row.type,confidence:row.confidence,title:row.subject||row.type,detail:`Held for review${names?`: proposed link to ${names}`:''}`,occurredAt:row.occurredAt,dueAt:null,evidence:{type:'signal',id:row.id},records:[],planHref:null,link:{fixed:`/app/capture#proposal-${row.proposalId}`}};});
}
