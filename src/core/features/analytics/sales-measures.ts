import type {Json} from '../../shared/expansion-contracts';
import {measureCatalog,type SalesDefinition,type SalesMeasure} from './sales-definition';
import {inPeriod,monthKey,type SalesPeriod} from './sales-period';
import type {SalesRow,StageConfig} from './sales-rows';

/** Each figure carries the exact rows behind it, so drill-through reconciles to the number shown. */
export type CellFormat='count'|'money'|'percent'|'days';
export interface Cell{key:string;label:string;format:CellFormat;value:number|null;rows:string[];values?:Record<string,number>;numerator?:string[];note?:string;success?:false}
export interface Group{key:string;label:string;cells:Cell[]}
export interface Table{key:string;title:string;groups:Group[]}
export interface Section{measure:SalesMeasure;title:string;definition:string;sources:string[];totals:Cell[];tables:Table[];months:Group[];missing:string[];withheld:string|null}
export interface Labels{stages:Map<string,StageConfig>;pipelines:Map<string,string>;operators:Map<string,string>|null}
const DAY=86400000,UNREADABLE='\u0000';
const keys=(rows:SalesRow[])=>rows.map(row=>row.key);
const count=(key:string,label:string,rows:SalesRow[],extra:Partial<Cell>={}):Cell=>({key,label,format:'count',value:rows.length,rows:keys(rows),...extra});
/** Sums only the amounts this viewer may read; a row whose amount is hidden is counted elsewhere but never summed. */
function money(key:string,label:string,rows:SalesRow[],fact='value_cents'):Cell{
 const valued=rows.filter(row=>typeof row.facts[fact]==='number'),values=Object.fromEntries(valued.map(row=>[row.key,row.facts[fact] as number]));
 return {key,label,format:'money',value:!rows.length?0:valued.length?valued.reduce((total,row)=>total+(row.facts[fact] as number),0):null,rows:keys(valued),values,...(valued.length<rows.length?{note:'Only amounts you may read are included.'}:{})};
}
const percent=(key:string,label:string,numerator:SalesRow[],denominator:SalesRow[]):Cell=>({key,label,format:'percent',value:denominator.length?numerator.length/denominator.length:null,rows:keys(denominator),numerator:keys(numerator)});
function days(key:string,label:string,rows:SalesRow[],measure:(row:SalesRow)=>number|null):Cell{
 const values:Record<string,number>={};for(const row of rows){const value=measure(row);if(value!==null&&Number.isFinite(value))values[row.key]=Math.max(0,value);}
 const list=Object.values(values);return {key,label,format:'days',value:list.length?list.reduce((a,b)=>a+b,0)/list.length:null,rows:Object.keys(values),values};
}
/** Group rows by a fact. A fact the viewer may not read groups as "Not available to you", so groups still add up to the totals. */
function grouped(rows:SalesRow[],keyOf:(row:SalesRow)=>string|undefined,label:(key:string)=>string,cells:(rows:SalesRow[])=>Cell[],order?:(key:string)=>number):Group[]{
 const groups=new Map<string,SalesRow[]>();for(const row of rows){const key=keyOf(row)??UNREADABLE,list=groups.get(key);if(list)list.push(row);else groups.set(key,[row]);}
 return [...groups].map(([key,members])=>({key,label:key===UNREADABLE?'Not available to you':label(key),cells:cells(members)})).sort((a,b)=>(order?order(a.key)-order(b.key):0)||a.label.localeCompare(b.label));
}
const fact=(row:SalesRow,name:string)=>!Object.hasOwn(row.facts,name)?undefined:typeof row.facts[name]==='string'?row.facts[name] as string:'';

export function aggregate(definition:SalesDefinition,period:SalesPeriod,asOf:string,rows:SalesRow[],labels:Labels):Section[]{
 const pipelines=new Set(definition.pipelineIds),reps=new Set(definition.repIds),now=Date.parse(asOf),full=labels.operators!==null;
 const pipelineOk=(row:SalesRow)=>{if(!pipelines.size)return true;const ids=Array.isArray(row.facts.deal_pipelines)?row.facts.deal_pipelines:[row.facts.pipeline_id];return ids.some(id=>typeof id==='string'&&pipelines.has(id));};
 const repOk=(value:Json|undefined)=>!reps.size||(typeof value==='string'&&reps.has(value));
 const month=(row:SalesRow)=>row.at?monthKey(Date.parse(row.at),period.timezone):undefined;
 const byMonth=(members:SalesRow[],cells:(rows:SalesRow[])=>Cell[])=>period.months.map(item=>({key:item.key,label:item.label,cells:cells(members.filter(row=>month(row)===item.key))}));
 const deals=rows.filter(row=>row.kind==='deal'&&pipelineOk(row)&&repOk(row.facts.owner_id));
 const pipelineName=(id:string)=>id?labels.pipelines.get(id)??'Pipeline no longer configured':'Not entered';
 const stageName=(id:string)=>{const stage=labels.stages.get(id);return stage?`${stage.pipelineName} · ${stage.name}`:'Stage no longer configured';};
 const stageOrder=(id:string)=>labels.stages.get(id)?.position??Number.MAX_SAFE_INTEGER;
 const operator=(id:string)=>id?labels.operators?.get(id)??'Unknown operator':'Unassigned';
 const withheld='Operator names need workspace settings access, so per-person groups are withheld. Totals use only records you may read.';
 const fullOnly='Messages and bookings are customer evidence that only full operators read, so none are counted for you.';
 const table=(key:string,title:string,groups:Group[]):Table[]=>[{key,title,groups}];
 /** The saved grouping for deal outcomes: by pipeline, by stage or by owner. */
 const byGrouping=(members:SalesRow[],cells:(rows:SalesRow[])=>Cell[]):Table[]=>definition.groupBy==='pipeline'?table('pipeline','Pipeline',grouped(members,row=>fact(row,'pipeline_id'),pipelineName,cells))
  :definition.groupBy==='stage'?table('stage','Stage',grouped(members,row=>fact(row,'stage_id'),stageName,cells,stageOrder)):full?table('owner','Owner',grouped(members,row=>fact(row,'owner_id'),operator,cells)):[];
 const closedIn=(row:SalesRow)=>(row.facts.lifecycle==='won'||row.facts.lifecycle==='lost')&&inPeriod(period,fact(row,'closed_at'));
 const sections:Section[]=[];
 const section=(measure:SalesMeasure,body:Partial<Omit<Section,'measure'|'title'|'definition'|'sources'>>&Pick<Section,'totals'>)=>sections.push({measure,...measureCatalog[measure],tables:[],months:[],missing:[],withheld:null,...body});
 for(const measure of definition.measures){
  if(measure==='pipeline'){
   const open=deals.filter(row=>row.facts.lifecycle==='open'),cells=(members:SalesRow[])=>[count('deals','Deals',members),money('value','Value',members)];
   section(measure,{totals:[count('deals','Open deals',open),money('value','Open value',open)],tables:[
    ...table('pipeline','Pipeline',grouped(open,row=>fact(row,'pipeline_id'),pipelineName,cells)),
    ...table('stage','Stage',grouped(open,row=>fact(row,'stage_id'),stageName,cells,stageOrder)),
    ...(full?table('owner','Owner',grouped(open,row=>fact(row,'owner_id'),operator,cells)):[])],withheld:full?null:withheld});
  }else if(measure==='reasons'){
   const closed=deals.filter(closedIn),won=closed.filter(row=>row.facts.lifecycle==='won'),lost=closed.filter(row=>row.facts.lifecycle==='lost');
   const reason=(row:SalesRow)=>{const text=fact(row,'close_reason');return text===undefined?undefined:`${row.facts.lifecycle}:${text.trim()}`;},missing=closed.filter(row=>fact(row,'close_reason')?.trim()==='').length;
   section(measure,{totals:[count('won','Won deals',won),money('won_value','Won value',won),count('lost','Lost deals',lost),money('lost_value','Lost value',lost)],
    tables:table('reason','Outcome · reason',grouped(closed,reason,key=>{const [outcome,...text]=key.split(':');return `${outcome==='won'?'Won':'Lost'} · ${text.join(':')||'Not entered'}`;},members=>[count('deals','Deals',members),money('value','Value',members)])),
    months:byMonth(closed,members=>[count('won','Won',members.filter(row=>row.facts.lifecycle==='won')),count('lost','Lost',members.filter(row=>row.facts.lifecycle==='lost'))]),
    missing:missing?[`${missing} closed ${missing===1?'deal has':'deals have'} no recorded reason and ${missing===1?'is':'are'} grouped as Not entered.`]:[]});
  }else if(measure==='revenue'){
   const won=deals.filter(row=>row.facts.lifecycle==='won'&&closedIn(row)),cells=(members:SalesRow[])=>[money('revenue','Closed-won revenue',members),count('won','Won deals',members)];
   section(measure,{totals:cells(won),tables:byGrouping(won,cells),months:byMonth(won,cells),withheld:definition.groupBy==='owner'&&!full?withheld:null});
  }else if(measure==='win_rate'){
   const closed=deals.filter(closedIn),cells=(members:SalesRow[])=>{const won=members.filter(row=>row.facts.lifecycle==='won');return [count('won','Won',won),count('lost','Lost',members.filter(row=>row.facts.lifecycle==='lost')),percent('rate','Win rate',won,members)];};
   section(measure,{totals:cells(closed),tables:byGrouping(closed,cells),months:byMonth(closed,cells),missing:closed.length?[]:['No deals were won or lost in this period, so the win rate has no value.'],withheld:definition.groupBy==='owner'&&!full?withheld:null});
  }else if(measure==='conversion'){
   const stageOk=(id:Json|undefined)=>{const stage=typeof id==='string'?labels.stages.get(id):undefined;return Boolean(stage&&(!pipelines.size||pipelines.has(stage.pipelineId)));};
   const owners=new Map(rows.filter(row=>row.kind==='deal').map(row=>[row.id,row]));
   const moves=rows.filter(row=>row.kind==='movement'&&owners.has(row.dealId!)&&repOk(owners.get(row.dealId!)!.facts.owner_id)&&(stageOk(row.facts.to)||stageOk(row.facts.from)));
   const later=(from:StageConfig|undefined,to:Json|undefined)=>{const next=typeof to==='string'?labels.stages.get(to):undefined;return Boolean(from&&next&&from.pipelineId===next.pipelineId&&next.position>from.position);};
   const forward=(row:SalesRow)=>later(labels.stages.get(String(row.facts.from)),row.facts.to);
   // Entry into a stage inside the period: a recorded move into it, or creation in it. The final stage of a pipeline has no later stage.
   const entered=new Map<string,Map<string,number>>();
   const enter=(stage:string,deal:string,at:number)=>{const map=entered.get(stage)??new Map<string,number>();map.set(deal,Math.min(map.get(deal)??Infinity,at));entered.set(stage,map);};
   for(const move of moves)if(stageOk(move.facts.to))enter(String(move.facts.to),move.dealId!,Date.parse(move.at!));
   for(const deal of rows.filter(row=>row.kind==='deal'&&repOk(row.facts.owner_id)))if(inPeriod(period,fact(deal,'created_at'))&&stageOk(deal.facts.creation_stage))enter(String(deal.facts.creation_stage),deal.id,Date.parse(String(deal.facts.created_at)));
   const final=(stage:StageConfig)=>![...labels.stages.values()].some(other=>other.pipelineId===stage.pipelineId&&other.position>stage.position);
   const groups:Group[]=[...entered].filter(([stageId])=>!final(labels.stages.get(stageId)!)).map(([stageId,members])=>{const stage=labels.stages.get(stageId)!,dealRows=[...members.keys()].map(id=>owners.get(id)!);const onward=dealRows.filter(deal=>moves.some(move=>move.dealId===deal.id&&Date.parse(move.at!)>=members.get(deal.id)!&&later(stage,move.facts.to)));return {key:stageId,label:stageName(stageId),cells:[count('entered','Entered',dealRows),count('moved_on','Moved on',onward),percent('conversion','Conversion',onward,dealRows)]};}).sort((a,b)=>stageOrder(a.key)-stageOrder(b.key));
   section(measure,{totals:[count('moves','Recorded stage moves',moves),count('forward','Moves to a later stage',moves.filter(forward))],tables:table('stage','Stage',groups),months:byMonth(moves,members=>[count('moves','Moves',members),count('forward','Forward',members.filter(forward))])});
  }else if(measure==='stage_age'){
   const open=deals.filter(row=>row.facts.lifecycle==='open'&&typeof row.facts.stage_id==='string'),aged=open.filter(row=>typeof row.facts.stage_entered_at==='string');
   const age=(row:SalesRow)=>(now-Date.parse(String(row.facts.stage_entered_at)))/DAY,cells=(members:SalesRow[])=>[count('deals','Open deals',members),days('age','Mean days in stage',members,age)];
   const missing=open.length-aged.length;
   section(measure,{totals:cells(aged),tables:table('stage','Stage',grouped(aged,row=>fact(row,'stage_id'),stageName,cells,stageOrder)),missing:missing?[`${missing} open ${missing===1?'deal has':'deals have'} no readable entry time for the current stage and ${missing===1?'is':'are'} not measured.`]:[]});
  }else if(measure==='sales_cycle'){
   const closed=deals.filter(row=>closedIn(row)&&typeof row.facts.created_at==='string');
   const cycle=(row:SalesRow)=>(Date.parse(String(row.facts.closed_at))-Date.parse(String(row.facts.created_at)))/DAY;
   const cells=(members:SalesRow[])=>[days('won','Won: mean days',members.filter(row=>row.facts.lifecycle==='won'),cycle),days('lost','Lost: mean days',members.filter(row=>row.facts.lifecycle==='lost'),cycle),days('all','All closed: mean days',members,cycle)];
   section(measure,{totals:cells(closed),tables:byGrouping(closed,cells),months:byMonth(closed,members=>[days('all','Mean days',members,cycle)]),withheld:definition.groupBy==='owner'&&!full?withheld:null});
  }else if(measure==='activities'){
   const activity=rows.filter(row=>(row.kind==='activity'||row.kind==='message')&&pipelineOk(row)&&repOk(row.facts.author_id));
   const cells=(members:SalesRow[])=>[...(['note','call','meeting'] as const).map(kind=>count(kind,{note:'Notes',call:'Calls',meeting:'Meetings'}[kind],members.filter(row=>row.kind==='activity'&&row.facts.activity===kind))),count('sent','Reviewed sent messages',members.filter(row=>row.kind==='message')),count('total','All activities',members)];
   section(measure,{totals:cells(activity),tables:full?table('author','Author',grouped(activity,row=>fact(row,'author_id'),operator,cells)):[],months:byMonth(activity,cells),withheld:full?null:`${withheld} ${fullOnly}`});
  }else if(measure==='tasks'){
   const tasks=rows.filter(row=>row.kind==='task'&&pipelineOk(row)&&repOk(row.facts.owner_id));
   const cells=(members:SalesRow[])=>{const completed=members.filter(row=>row.facts.status==='completed');return [count('due','Due',members),count('completed','Completed',completed),count('overdue','Overdue',members.filter(row=>row.facts.status==='open'&&Date.parse(String(row.facts.due_at))<now)),percent('completion','Completed of due',completed,members)];};
   section(measure,{totals:cells(tasks),tables:full?table('assignee','Assignee',grouped(tasks,row=>fact(row,'owner_id'),operator,cells)):[],months:byMonth(tasks,cells),withheld:full?null:withheld});
  }else if(measure==='bookings'){
   const bookings=rows.filter(row=>row.kind==='booking'&&pipelineOk(row)),cells=(members:SalesRow[])=>[count('booked','Booked meetings',members.filter(row=>row.facts.cancelled!==true)),count('cancelled','Cancellations',members.filter(row=>row.facts.cancelled===true))];
   section(measure,{totals:cells(bookings),tables:table('intake','Booking intake',grouped(bookings,row=>fact(row,'provider'),key=>({calendly:'Calendly',calcom:'Cal.com'} as Record<string,string>)[key]??'Other signed source',cells)),months:byMonth(bookings,cells),withheld:full?null:fullOnly});
  }else if(measure==='follow_up'){
   const sent=rows.filter(row=>row.kind==='message'&&row.facts.scheduled===true&&pipelineOk(row)&&repOk(row.facts.author_id)),flag=(name:string)=>sent.filter(row=>row.facts[name]===true);
   section(measure,{totals:[count('sent','Scheduled messages sent',sent),count('delivered','Delivered',flag('delivered')),count('replied','Genuine replies',flag('replied')),count('meeting','Meetings booked',flag('meeting')),count('advanced','Stage advances',flag('advanced')),count('won','Deals won',flag('won')),money('won_value','Won value',flag('won')),count('inferred_open','Reported opens (inferred, never success)',flag('inferred_open'),{success:false}),count('automatic_reply','Automatic replies (never a reply)',flag('automatic_reply'),{success:false})],
    months:byMonth(sent,members=>[count('sent','Sent',members),count('replied','Genuine replies',members.filter(row=>row.facts.replied===true)),count('meeting','Meetings booked',members.filter(row=>row.facts.meeting===true))]),withheld:full?null:fullOnly});
  }
 }
 return sections;
}

/** Every row key a section cites: a saved result keeps exactly these rows. */
export function citedRows(sections:Section[]){const cited=new Set<string>();const add=(cell:Cell)=>{for(const key of [...cell.rows,...cell.numerator??[]])cited.add(key);};for(const section of sections){section.totals.forEach(add);for(const group of [...section.tables.flatMap(item=>item.groups),...section.months])group.cells.forEach(add);}return cited;}
