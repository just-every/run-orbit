import type {Brief,BriefAccount,BriefLine,RecordRef} from './types';
import {accountFor,delegationTarget,entryHref,existing,indexRecords,recordHref,recordName,type RecordIndex} from './links';
import {newSignalLines,type RawLine} from './signal-lines';
import {promiseLines} from './promises';
import {proposalLines,unresolvedLines} from './unresolved';
import {briefPolicy,briefWindow} from './window';

const LIMIT=200;
const order=(a:BriefLine,b:BriefLine)=>b.occurredAt.localeCompare(a.occurredAt)||a.id.localeCompare(b.id);

/** Narrows the brief to what a delegated application may read: lines resting on its selected records. */
export type Visibility=(line:BriefLine)=>boolean;
export const selectedTargets=(targets:string[]):Visibility=>{const selected=new Set(targets);return line=>line.records.some(ref=>selected.has(delegationTarget(ref)))||(line.evidence.type==='signal'&&selected.has(`signals/${line.evidence.id}`));};

function resolve(raw:RawLine,index:RecordIndex):BriefLine|null{
 const {link,...line}=raw,records=existing(index,raw.records);
 if(line.group!=='unresolved'&&!records.length)return null;
 if('fixed' in link)return {...line,records,href:link.fixed};
 const entries=link.entries.filter(entry=>records.some(ref=>ref.type===entry.ref.type&&ref.id===entry.ref.id));
 const entry=entries.find(item=>item.ref.type==='opportunity')??entries[0];
 return {...line,records,href:entry?entryHref(entry.ref,entry.entryId):recordHref(records[0]!)};
}

/** Today's brief for one operator, computed from records only; no AI provider is involved. */
export async function buildBrief(db:D1Database,input:{operatorId:string;now?:Date;visible?:Visibility}):Promise<Brief>{
 const now=input.now??new Date(),policy=await briefPolicy(db),window=await briefWindow(db,input.operatorId,now,policy);
 const [fresh,promises,proposals,unresolvedRaw]=await Promise.all([newSignalLines(db,window.since,LIMIT),promiseLines(db,now,policy,LIMIT),proposalLines(db,LIMIT),unresolvedLines(db,LIMIT)]);
 const raw=[...fresh.lines,...promises,...proposals,...unresolvedRaw],index=await indexRecords(db,raw.flatMap(line=>line.records));
 const visible=input.visible??(()=>true),lines=raw.map(line=>resolve(line,index)).filter((line):line is BriefLine=>Boolean(line)&&visible(line!));
 const accounts=new Map<string,BriefAccount>(),unresolved:BriefLine[]=[];
 for(const line of lines){
  if(line.group==='unresolved'){unresolved.push(line);continue;}
  const ref=accountFor(index,line.records) as RecordRef,key=`${ref.type}:${ref.id}`;
  const account=accounts.get(key)??{key,type:ref.type,id:ref.id,name:recordName(index,ref),href:recordHref(ref),lines:[]};
  account.lines.push(line);accounts.set(key,account);
 }
 const sorted=[...accounts.values()].map(account=>({...account,lines:account.lines.sort(order)})).sort((a,b)=>order(a.lines[0]!,b.lines[0]!));
 const count=(test:(line:BriefLine)=>boolean)=>lines.filter(test).length;
 return {generatedAt:now.toISOString(),since:window.since,sinceBasis:window.basis,policy,accounts:sorted,unresolved:unresolved.sort(order),
  counts:{replies:count(l=>l.kind==='reply'),meetings:count(l=>l.kind==='meeting'),observed:count(l=>l.kind==='signal'&&l.confidence==='observed'),inferred:count(l=>l.kind==='signal'&&l.confidence==='inferred'),promises:count(l=>l.group==='promise'),proposals:count(l=>l.group==='proposal'),unresolved:unresolved.length},
  truncated:fresh.truncated};
}
