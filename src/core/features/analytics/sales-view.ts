import type {Json} from '../../shared/expansion-contracts';
import type {SalesDefinition} from './sales-definition';
import type {SalesPeriod} from './sales-period';
import type {Cell,Section} from './sales-measures';
import type {ViewerAccess} from './sales-access';
import type {SalesRow,StageConfig} from './sales-rows';

/** What preview, history and export disclose: period and timezone, definitions, source fields, currency, missing data and freshness. */
export interface RowView{key:string;kind:string;label:string;detail:string;href:string|null;at:string|null;recordedAt:string|null;facts:Record<string,Json>}
export interface LateCell{key:string;label:string;group:string|null;format:Cell['format'];value:number;rows:string[]}
export interface LateSection{measure:string;title:string;cells:LateCell[]}
export interface SalesView{kind:'sales';id:string;saved:boolean;definitionId:string;definitionVersion:number;name:string;description:string;definition:SalesDefinition;
 period:SalesPeriod&{bucket:string;boundaries:string};timezone:string;currency:string;asOf:string;freshness:string;access:{limited:boolean;note:string};
 filters:{pipelines:{id:string;name:string}[];reps:{id:string;name:string}[]|null;groupBy:string;notes:string[]};
 stages:StageConfig[];sections:Section[];rows:Record<string,RowView>;late:{computedAt:string;note:string;sections:LateSection[];rows:Record<string,RowView>}|null;
 sources:string[];missing:string[];reviewHash?:string}
const date=(at:string|null,timeZone:string)=>at&&Number.isFinite(Date.parse(at))?new Intl.DateTimeFormat('en-US',{timeZone,month:'short',day:'numeric',year:'numeric'}).format(new Date(at)):'date unavailable';
const nouns:Record<string,string>={opportunity:'a deal',contact:'a contact',company:'a company'};
const local=(at:string,timeZone:string)=>new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(at));
function rowViews(rows:SalesRow[],access:ViewerAccess,stages:StageConfig[],timezone:string):Record<string,RowView>{
 const stage=(id:Json|undefined)=>{const found=stages.find(item=>item.id===id);return found?`${found.pipelineName} · ${found.name}`:'a stage no longer configured';};
 const name=(type:string,id:string)=>access.records.get(`${type}:${id}`)?.name??null;
 const author=(id:Json|undefined)=>typeof id==='string'?access.operatorNames?.get(id)??null:null;
 const views:Record<string,RowView>={};
 for(const row of rows){
  const primary=row.dealId?{type:'opportunity',id:row.dealId}:row.refs[0],record=primary?name(primary.type,primary.id)??nouns[primary.type]!:'an unlinked booking',by=author(row.facts.author_id??row.facts.owner_id);
  let label='',detail='';
  if(row.kind==='deal'){label=name('opportunity',row.id)??'A deal';detail=[typeof row.facts.lifecycle==='string'?({open:'Open',won:'Won',lost:'Lost'} as Record<string,string>)[row.facts.lifecycle]??'':'',row.facts.stage_id!==undefined?stage(row.facts.stage_id):'',typeof row.facts.closed_at==='string'?`closed ${date(row.facts.closed_at,timezone)}`:''].filter(Boolean).join(' · ');}
  else if(row.kind==='movement'){label=`${record}: ${stage(row.facts.from)} → ${stage(row.facts.to)}`;detail=`Moved ${date(row.at,timezone)}`;}
  else if(row.kind==='activity'){label=`${({note:'Note',call:'Call',meeting:'Meeting'} as Record<string,string>)[String(row.facts.activity)]??'Activity'} on ${record}`;detail=[date(row.at,timezone),by?`by ${by}`:''].filter(Boolean).join(' · ');}
  else if(row.kind==='message'){label=`Reviewed message on ${record}`;detail=[`Accepted ${date(row.at,timezone)}`,by?`approved by ${by}`:'',row.facts.scheduled===true?'scheduled':'sent at approval',...(['delivered','replied','meeting','advanced','won'] as const).filter(fact=>row.facts[fact]===true).map(fact=>({delivered:'delivered',replied:'genuine reply',meeting:'meeting booked',advanced:'stage advanced',won:'deal won'})[fact]),row.facts.inferred_open===true?'reported open (inferred, not success)':'',row.facts.automatic_reply===true?'automatic reply (not a reply)':''].filter(Boolean).join(' · ');}
  else if(row.kind==='task'){label=`Task on ${record}`;detail=[`Due ${date(row.at,timezone)}`,String(row.facts.status??''),by?`assigned to ${by}`:''].filter(Boolean).join(' · ');}
  else {label=`${({calendly:'Calendly',calcom:'Cal.com'} as Record<string,string>)[String(row.facts.provider)]??'Signed'} ${row.facts.cancelled===true?'cancellation':'booking'} for ${record}`;detail=date(row.at,timezone);}
  views[row.key]={key:row.key,kind:row.kind,label,detail,href:primary?`/app/shared-records?${new URLSearchParams({kind:primary.type,id:primary.id})}`:null,at:row.at,recordedAt:row.recordedAt,facts:row.facts};
 }
 return views;
}
/** Rows now behind a figure that the saved result did not count and that were recorded after it was saved. */
export function lateArriving(saved:Section[],current:Section[],rows:Map<string,SalesRow>,asOf:string):LateSection[]{
 const result:LateSection[]=[],after=(key:string)=>{const at=rows.get(key)?.recordedAt;return Boolean(at&&Date.parse(at)>Date.parse(asOf));};
 for(const section of current){
  // Open pipeline and stage age describe the moment of computation, not a period.
  if(section.measure==='pipeline'||section.measure==='stage_age')continue;
  const original=saved.find(item=>item.measure===section.measure),cells:LateCell[]=[];
  const compare=(cell:Cell,before:Cell|undefined,group:string|null)=>{if(cell.format!=='count'&&cell.format!=='money')return;const known=new Set(before?.rows??[]),fresh=cell.rows.filter(key=>!known.has(key)&&after(key));if(!fresh.length)return;cells.push({key:cell.key,label:cell.label,group,format:cell.format,value:cell.format==='money'?fresh.reduce((total,key)=>total+(cell.values?.[key]??0),0):fresh.length,rows:fresh});};
  for(const cell of section.totals)compare(cell,original?.totals.find(item=>item.key===cell.key),null);
  for(const table of section.tables)for(const group of table.groups)for(const cell of group.cells)compare(cell,original?.tables.find(item=>item.key===table.key)?.groups.find(item=>item.key===group.key)?.cells.find(item=>item.key===cell.key),group.label);
  for(const group of section.months)for(const cell of group.cells)compare(cell,original?.months.find(item=>item.key===group.key)?.cells.find(item=>item.key===cell.key),group.label);
  if(cells.length)result.push({measure:section.measure,title:section.title,cells});
 }
 return result;
}
export function salesView(input:{id:string;saved:boolean;definitionId:string;definitionVersion:number;definition:SalesDefinition;period:SalesPeriod;currency:string;asOf:string;stages:StageConfig[];sections:Section[];rows:SalesRow[];access:ViewerAccess;limited:boolean;reviewHash?:string;late:{sections:LateSection[];rows:SalesRow[];computedAt:string;access:ViewerAccess}|null}):SalesView{
 const {definition,period}=input,pipelineNames=new Map(input.stages.map(stage=>[stage.pipelineId,stage.pipelineName]));
 const lateKeys=new Set(input.late?.sections.flatMap(section=>section.cells.flatMap(cell=>cell.rows))??[]);
 const notes=[...(definition.pipelineIds.length?['Filtered to the chosen pipelines: activities, tasks, messages and bookings count only when linked to a deal in them.']:[]),...(definition.repIds.length?['The rep filter applies to the deal owner, activity author, message approver and task assignee; bookings are not filtered by rep.']:[])];
 return {stages:input.stages,kind:'sales',id:input.id,saved:input.saved,definitionId:input.definitionId,definitionVersion:input.definitionVersion,name:definition.name,description:definition.description,definition,
  period:{...period,bucket:'Monthly buckets on local calendar months',boundaries:`Each month starts at local midnight on its first day in ${period.timezone} (included) and ends at local midnight on the next month's first day (excluded).`},timezone:period.timezone,currency:input.currency,asOf:input.asOf,
  freshness:input.saved?`Saved result measured ${local(input.asOf,period.timezone)} (${input.asOf}). Evidence recorded later is shown separately as late-arriving and never changes this result; recompute to create a separate result.`:`Computed ${local(input.asOf,period.timezone)} (${input.asOf}) from current records, checked against current data and access in the same transaction. Not saved.`,
  access:{limited:input.limited,note:input.access.full?(input.limited?'Limited to your access now: some saved rows or fields are no longer readable, so only what you may read is shown.':'Computed from every record in this workspace; you are a full operator.'):'Limited to your access: only records and fields you may read now are included, and nothing about hidden records is counted. Sharing a report grants no record access.'},
  filters:{pipelines:definition.pipelineIds.map(id=>({id,name:pipelineNames.get(id)??'Pipeline no longer configured'})),reps:input.access.operatorNames?definition.repIds.map(id=>({id,name:input.access.operatorNames!.get(id)??'Unknown operator'})):null,groupBy:definition.groupBy,notes},
  sections:input.sections,rows:rowViews(input.rows,input.access,input.stages,period.timezone),
  late:input.late?{computedAt:input.late.computedAt,note:'Recorded after this result was saved, dated inside its period, and counted under your access now. The original figures above are unchanged.',sections:input.late.sections,rows:rowViews(input.late.rows.filter(row=>lateKeys.has(row.key)),input.late.access,input.stages,period.timezone)}:null,
  sources:[...new Set(input.sections.flatMap(section=>section.sources))],missing:[...input.sections.flatMap(section=>section.missing.map(text=>`${section.title}: ${text}`)),...notes],
  ...(input.reviewHash?{reviewHash:input.reviewHash}:{})};
}
