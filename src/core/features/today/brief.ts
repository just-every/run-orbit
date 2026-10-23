import {recordMailPromises} from './record-mail';
import type {Brief,BriefAccount,BriefLine,RecordRef} from './types';
import {accountFor,delegationTarget,entryHref,existing,indexRecords,recordHref,recordName,signalEvidenceHref,type RecordIndex} from './links';
import {newSignalLines,type RawLine} from './signal-lines';
import {promiseLines} from './promises';
import {heldDetail,heldLines,proposalLines,unresolvedLines} from './unresolved';
import {briefPolicy,briefWindow} from './window';

const LIMIT=200;
const order=(a:BriefLine,b:BriefLine)=>b.occurredAt.localeCompare(a.occurredAt)||a.id.localeCompare(b.id);

/** Narrows the brief to what a delegated application may read: its selected records, and signals it selected by id.
 * A line keeps only the records in the grant; one seen only through a selected signal names no other record, contact or company. */
export interface Visibility {record:(ref:RecordRef)=>boolean;signal:(id:string)=>boolean}
/** Evidence is within a grant when it rests on a granted opportunity, or on no opportunity and a granted contact or company:
 * a contact or company shared with another deal never opens that deal's drafts, signals or notes. Callers drop the records outside the grant. */
export const withinGrant=(records:RecordRef[],allowed:(ref:RecordRef)=>boolean)=>{const deals=records.filter(ref=>ref.type==='opportunity');return deals.length?deals.some(allowed):records.some(allowed);};
export const selectedTargets=(targets:string[]):Visibility=>{const selected=new Set(targets);return {record:ref=>selected.has(delegationTarget(ref)),signal:id=>selected.has(`signals/${id}`)};};

function resolve(raw:RawLine,index:RecordIndex,visible?:Visibility):BriefLine|null{
 const {link,proposed,...line}=raw;let records=existing(index,raw.records);
 if(line.group!=='unresolved'&&line.group!=='held'&&!records.length)return null;
 if(proposed)line.detail=heldDetail(proposed.filter(item=>!visible||visible.record(item.ref)).map(item=>item.name));
 if(visible){
  if(!withinGrant(records,visible.record)&&!(line.evidence.type==='signal'&&visible.signal(line.evidence.id)))return null;
  records=records.filter(visible.record);
  if(!records.length)return {...line,records,href:signalEvidenceHref(line.evidence.id)};
 }
 if('fixed' in link)return {...line,records,href:link.fixed};
 const entries=link.entries.filter(entry=>records.some(ref=>ref.type===entry.ref.type&&ref.id===entry.ref.id));
 const entry=entries.find(item=>item.ref.type==='opportunity')??entries[0];
 return {...line,records,href:entry?entryHref(entry.ref,entry.entryId):recordHref(records[0]!)};
}

/** Today's brief for one operator, computed from records only; no AI provider is involved. */
export async function buildBrief(db:D1Database,input:{operatorId:string;now?:Date;visible?:Visibility}):Promise<Brief>{
 const now=input.now??new Date(),policy=await briefPolicy(db),window=await briefWindow(db,input.operatorId,now,policy);
 const [fresh,promises,proposals,unresolvedRaw,heldRaw,mailPromises]=await Promise.all([newSignalLines(db,window.since,LIMIT),promiseLines(db,now,policy,LIMIT),proposalLines(db,LIMIT),unresolvedLines(db,LIMIT),heldLines(db,LIMIT),recordMailPromises(db,input.operatorId,now,LIMIT)]);
 const raw=[...fresh.lines,...promises,...mailPromises,...proposals,...unresolvedRaw,...heldRaw],index=await indexRecords(db,raw.flatMap(line=>line.records));
 const lines=raw.map(line=>resolve(line,index,input.visible)).filter((line):line is BriefLine=>Boolean(line));
 const accounts=new Map<string,BriefAccount>(),unresolved:BriefLine[]=[],held:BriefLine[]=[],selectedSignals:BriefLine[]=[];
 for(const line of lines){
  if(line.group==='unresolved'){unresolved.push(line);continue;}
  if(line.group==='held'){held.push(line);continue;}
  const ref=accountFor(index,line.records,input.visible?.record);
  if(!ref){selectedSignals.push(line);continue;}
  const key=`${ref.type}:${ref.id}`;
  const account=accounts.get(key)??{key,type:ref.type,id:ref.id,name:recordName(index,ref),href:recordHref(ref),lines:[]};
  account.lines.push(line);accounts.set(key,account);
 }
 const sorted=[...accounts.values()].map(account=>({...account,lines:account.lines.sort(order)})).sort((a,b)=>order(a.lines[0]!,b.lines[0]!));
 const count=(test:(line:BriefLine)=>boolean)=>lines.filter(test).length;
 return {generatedAt:now.toISOString(),since:window.since,sinceBasis:window.basis,policy,accounts:sorted,unresolved:unresolved.sort(order),held:held.sort(order),selectedSignals:selectedSignals.sort(order),
  counts:{replies:count(l=>l.kind==='reply'),meetings:count(l=>l.kind==='meeting'),observed:count(l=>l.kind==='signal'&&l.confidence==='observed'),inferred:count(l=>l.kind==='signal'&&l.confidence==='inferred'),promises:count(l=>l.group==='promise'),proposals:count(l=>l.group==='proposal'),unresolved:unresolved.length,held:held.length},
  truncated:fresh.truncated};
}
