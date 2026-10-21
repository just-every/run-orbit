import type {Json,SqlValue} from '../../shared/expansion-contracts';
import {AccessError} from '../access/errors';
import type {SalesPeriod} from './sales-period';
import {inPeriod} from './sales-period';
import type {GraphKind,GraphRef,SalesRow,StageConfig} from './sales-rows';

/** Native activity, message, task, booking and movement rows for a period. Every source is read as one JSON value in
 * one statement, and a save re-runs that statement inside its commit: any change to the population refuses the save.
 * Access is applied afterwards, per viewer. */
type Cell=string|number|null;
const day=(instant:string,shift:number)=>new Date(Date.parse(instant)+shift*86400000).toISOString().slice(0,10);
const ref=(type:Cell,id:Cell):GraphRef[]=>typeof type==='string'&&typeof id==='string'&&['opportunity','contact','company'].includes(type)?[{type:type as GraphKind,id}]:[];
const latest=(values:Cell[])=>values.filter((value):value is string=>typeof value==='string'&&Number.isFinite(Date.parse(value))).sort((a,b)=>Date.parse(a)-Date.parse(b)).at(-1)??null;
const after=(at:Cell,from:number)=>typeof at==='string'&&Date.parse(at)>=from;
const push=<K,V>(map:Map<K,V[]>,key:K,value:V)=>{const list=map.get(key);if(list)list.push(value);else map.set(key,[value]);};
/** Messages accepted for sending in the window; one row per message at its first acceptance. */
const accepted="WITH accepted AS(SELECT json_extract(t.payload_json,'$.messageId') AS message_id,MIN(t.occurred_at) AS occurred_at,MIN(t.recorded_at) AS recorded_at FROM timeline_entries t WHERE t.kind='message.accepted' GROUP BY 1),scoped AS(SELECT m.id,m.opportunity_id,m.contact_id,m.operator_id,m.scheduled_at,a.occurred_at,a.recorded_at FROM outbound_messages m JOIN accepted a ON a.message_id=m.id WHERE substr(a.occurred_at,1,10) BETWEEN ? AND ?)";
const sources:{name:string;columns:string;from:string;window:'none'|'start'|'both'}[]=[
 {name:'stages',window:'none',columns:'id,name,position,pipeline_id,pipeline_name',from:'SELECT s.id,s.name,s.position,r.pipeline_id,p.name AS pipeline_name FROM pipeline_stages s JOIN pipeline_stage_rules r ON r.stage_id=s.id JOIN pipelines p ON p.id=r.pipeline_id ORDER BY s.position,s.id'},
 // Movement from the window start until now: conversion, creation stages and stage advances after an accepted message.
 {name:'movements',window:'start',columns:'id,occurred_at,recorded_at,deal_id,previous,current,previous_pipeline,current_pipeline',from:"SELECT t.id,t.occurred_at,t.recorded_at,r.record_id AS deal_id,json_extract(t.payload_json,'$.previous') AS previous,json_extract(t.payload_json,'$.current') AS current,json_extract(t.payload_json,'$.previousPipelineId') AS previous_pipeline,json_extract(t.payload_json,'$.currentPipelineId') AS current_pipeline FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id AND r.record_type='opportunity' WHERE t.kind='stage.changed' AND substr(t.occurred_at,1,10)>=? ORDER BY t.occurred_at,t.id"},
 // Time in the current stage of every open deal, from its latest recorded move into that stage.
 {name:'entered',window:'none',columns:'id,entered_at,moves',from:"SELECT o.id,(SELECT MAX(t.occurred_at) FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id AND r.record_type='opportunity' WHERE r.record_id=o.id AND t.kind='stage.changed' AND json_extract(t.payload_json,'$.current')=o.stage_id) AS entered_at,(SELECT count(*) FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id AND r.record_type='opportunity' WHERE r.record_id=o.id AND t.kind='stage.changed') AS moves FROM opportunities o WHERE o.lifecycle='open' ORDER BY o.id"},
 {name:'activities',window:'both',columns:'id,kind,occurred_at,recorded_at,actor_id,record_type,record_id',from:"SELECT t.id,t.kind,t.occurred_at,t.recorded_at,t.actor_id,r.record_type,r.record_id FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE t.kind IN('manual.note','manual.call','manual.meeting') AND substr(t.occurred_at,1,10) BETWEEN ? AND ? ORDER BY t.occurred_at,t.id,r.record_type,r.record_id"},
 {name:'messages',window:'both',columns:'id,opportunity_id,contact_id,operator_id,scheduled_at,occurred_at,recorded_at',from:`${accepted} SELECT * FROM scoped ORDER BY occurred_at,id`},
 {name:'deliveries',window:'both',columns:'kind,message_id,occurred_at,recorded_at',from:`${accepted} SELECT t.kind,json_extract(t.payload_json,'$.messageId') AS message_id,t.occurred_at,t.recorded_at FROM timeline_entries t WHERE t.kind IN('provider.delivered','provider.open','provider.click') AND json_extract(t.payload_json,'$.messageId') IN(SELECT id FROM scoped) ORDER BY t.occurred_at,t.id`},
 // SEQUENCE-002 outcome evidence on the message's deal: genuine and automatic replies, bookings and reported opens.
 {name:'evidence',window:'both',columns:'id,type,occurred_at,received_at,deal_id',from:`${accepted} SELECT s.id,s.type,s.occurred_at,s.received_at,l.record_id AS deal_id FROM signals s JOIN signal_links l ON l.signal_id=s.id AND l.record_type='opportunity' WHERE (s.type IN('email.replied','meeting.booked','email.opened','page.viewed') OR s.type LIKE '%:email.auto_replied') AND l.record_id IN(SELECT opportunity_id FROM scoped) ORDER BY s.occurred_at,s.id,l.record_id`},
 {name:'tasks',window:'both',columns:'id,record_type,contact_id,company_id,opportunity_id,owner_id,due_at,status,updated_at,created_at',from:"SELECT id,record_type,contact_id,company_id,opportunity_id,owner_id,due_at,status,updated_at,created_at FROM sales_tasks WHERE status<>'cancelled' AND substr(due_at,1,10) BETWEEN ? AND ? ORDER BY due_at,id"},
 // Signed booking intake: Calendly, Cal.com and other signed webhook sources. Capture and operator-attested events are not intake.
 {name:'bookings',window:'both',columns:'id,type,occurred_at,received_at,source_event_id,source_name,json(links)',from:"SELECT s.id,s.type,s.occurred_at,s.received_at,s.source_event_id,ss.name AS source_name,json((SELECT json_group_array(json_array(record_type,record_id)) FROM (SELECT record_type,record_id FROM signal_links WHERE signal_id=s.id ORDER BY record_type,record_id))) AS links FROM signals s JOIN signal_sources ss ON ss.id=s.source_id AND ss.type='signed_webhook' WHERE s.type IN('meeting.booked','meeting.cancelled') AND substr(s.occurred_at,1,10) BETWEEN ? AND ? ORDER BY s.occurred_at,s.id"},
];
export interface Movement{id:string;at:string;recordedAt:string;dealId:string;from:string|null;to:string|null;fromPipeline:string|null;toPipeline:string|null}
export interface NativePopulation{fingerprint:{sql:string;bindings:SqlValue[];value:string};stages:StageConfig[];movements:Map<string,Movement[]>;entered:Map<string,{at:string|null;moves:number}>;rows:SalesRow[]}

/** One statement returns every source as JSON; the same statement fences a save to exactly this population. */
function statement(period:SalesPeriod){
 const start=day(period.from,-1),end=day(period.through,1),bindings:SqlValue[]=[];
 const parts=sources.map(source=>{bindings.push(...(source.window==='both'?[start,end]:source.window==='start'?[start]:[]));return `'${source.name}',json((SELECT json_group_array(json_array(${source.columns})) FROM (${source.from})))`;});
 return {sql:`SELECT json_object(${parts.join(',')}) AS population`,bindings};
}

export async function nativePopulation(db:D1Database,period:SalesPeriod):Promise<NativePopulation>{
 const query=statement(period),value=await db.prepare(query.sql).bind(...query.bindings).first<string>('population');
 if(typeof value!=='string')throw new AccessError('prerequisite','Sales report sources are unavailable.');
 const data=JSON.parse(value) as Record<string,Cell[][]>,rows:SalesRow[]=[];
 const stages=data.stages!.map(([id,name,position,pipelineId,pipelineName])=>({id:String(id),name:String(name),position:Number(position),pipelineId:String(pipelineId),pipelineName:String(pipelineName)}));
 const stage=new Map(stages.map(item=>[item.id,item]));
 const moves:Movement[]=data.movements!.map(([id,at,recordedAt,dealId,from,to,fromPipeline,toPipeline])=>({id:String(id),at:String(at),recordedAt:String(recordedAt),dealId:String(dealId),from:from as string|null,to:to as string|null,fromPipeline:(fromPipeline as string|null)??stage.get(String(from))?.pipelineId??null,toPipeline:(toPipeline as string|null)??stage.get(String(to))?.pipelineId??null}));
 const movements=new Map<string,Movement[]>(),deliveries=new Map<Cell,Cell[][]>(),evidence=new Map<Cell,Cell[][]>();
 for(const move of moves)push(movements,move.dealId,move);
 for(const row of data.deliveries!)push(deliveries,row[1]!,row);
 for(const row of data.evidence!)push(evidence,row[4]!,row);
 const entered=new Map(data.entered!.map(([id,at,moves])=>[String(id),{at:at as string|null,moves:Number(moves)}]));
 for(const move of moves)if(inPeriod(period,move.at))rows.push({key:`movement:${move.id}`,kind:'movement',id:move.id,refs:[{type:'opportunity',id:move.dealId}],dealId:move.dealId,needs:['stage_id'],at:move.at,recordedAt:move.recordedAt,facts:{from:move.from,to:move.to,from_pipeline:move.fromPipeline,to_pipeline:move.toPipeline}});
 for(const [id,kind,at,recordedAt,author,type,record] of data.activities!){
  if(!inPeriod(period,at as string))continue;const linked=ref(type,record);
  rows.push({key:`activity:${id}`,kind:'activity',id:String(id),refs:linked,entries:linked[0],dealId:type==='opportunity'?String(record):undefined,at:String(at),recordedAt:String(recordedAt),facts:{activity:String(kind).replace('manual.',''),author_id:author}});
 }
 for(const [id,deal,contact,author,scheduled,at,recordedAt] of data.messages!){
  if(!inPeriod(period,at as string))continue;const acceptedAt=Date.parse(String(at));
  const own=(deliveries.get(id)??[]).filter(([,,occurred])=>after(occurred,acceptedAt)),linked=(evidence.get(deal)??[]).filter(([,,occurred])=>after(occurred,acceptedAt));
  const delivered=(deliveries.get(id)??[]).filter(([kind])=>kind==='provider.delivered'),replies=linked.filter(([,type])=>type==='email.replied'),meetings=linked.filter(([,type])=>type==='meeting.booked');
  const automatic=linked.filter(([,type])=>String(type).endsWith(':email.auto_replied')),opens=[...own.filter(([kind])=>kind!=='provider.delivered'),...linked.filter(([,type])=>type==='email.opened'||type==='page.viewed')];
  const advances=(movements.get(String(deal))??[]).filter(move=>Date.parse(move.at)>=acceptedAt&&move.fromPipeline!==null&&move.fromPipeline===move.toPipeline&&(stage.get(String(move.to))?.position??-1)>(stage.get(String(move.from))?.position??Infinity));
  const facts:Record<string,Json>={author_id:author,scheduled:scheduled!==null,delivered:delivered.length>0,replied:replies.length>0,meeting:meetings.length>0,advanced:advances.length>0,inferred_open:opens.length>0,automatic_reply:automatic.length>0};
  rows.push({key:`message:${id}`,kind:'message',id:String(id),refs:[...ref('opportunity',deal),...ref('contact',contact)],full:true,dealId:String(deal),at:String(at),recordedAt:latest([recordedAt,...delivered.map(row=>row[3]!),...replies.map(row=>row[3]!),...meetings.map(row=>row[3]!),...advances.map(move=>move.recordedAt)]),facts});
 }
 for(const [id,type,contact,company,deal,owner,due,status,updated,created] of data.tasks!){
  if(!inPeriod(period,due as string))continue;const linked=ref(type,contact??company??deal);
  rows.push({key:`task:${id}`,kind:'task',id:String(id),refs:linked,entries:linked[0],dealId:type==='opportunity'?String(deal):undefined,at:String(due),recordedAt:String(status==='completed'?updated:created),facts:{owner_id:owner,status,due_at:due,completed_at:status==='completed'?updated:null}});
 }
 for(const [id,type,at,received,event,source,links] of data.bookings!){
  if(!inPeriod(period,at as string))continue;const linked=(links as unknown as Cell[][]).flatMap(([kind,record])=>ref(kind,record)),provider=String(event).split(':')[0];
  rows.push({key:`booking:${id}`,kind:'booking',id:String(id),refs:linked,full:true,at:String(at),recordedAt:String(received),facts:{provider:provider==='calendly'||provider==='calcom'?provider:'signed',source:source,cancelled:type==='meeting.cancelled',deal_ids:linked.filter(link=>link.type==='opportunity').map(link=>link.id)}});
 }
 return {fingerprint:{...query,value},stages,movements,entered,rows};
}

/** Deal facts from the viewer's readable graph values, plus stage history facts derived from recorded movement. */
export function dealFacts(values:Record<string,Json>,dealId:string,population:Pick<NativePopulation,'movements'|'entered'|'stages'>):Record<string,Json>{
 const facts:Record<string,Json>={};for(const field of ['lifecycle','stage_id','owner_id','value_cents','close_reason','closed_at','created_at'])if(Object.hasOwn(values,field))facts[field]=values[field]!;
 if(typeof values.stage_id!=='string')return facts;
 facts.pipeline_id=population.stages.find(stage=>stage.id===values.stage_id)?.pipelineId??null;
 if(typeof values.created_at!=='string')return facts;
 // A deal created inside the window has every move in the window; its first move left the stage it was created in.
 const own=population.movements.get(dealId)??[],entry=population.entered.get(dealId);
 facts.creation_stage=own.length&&Date.parse(own[0]!.at)>=Date.parse(values.created_at)?own[0]!.from:values.stage_id;
 if(entry)facts.stage_entered_at=entry.at??(entry.moves?null:values.created_at);
 return facts;
}
