import type {SalesView} from '../analytics/sales-view';
import type {DashboardFilters} from './schema';
export const dashboardLocal=(at:string,timezone:string,date=false)=>new Intl.DateTimeFormat('en-US',{timeZone:timezone,...(date?{month:'short',day:'numeric',year:'numeric'} as const:{}),hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(at));
export const dashboardDay=(at:string|null,timezone:string)=>at&&Number.isFinite(Date.parse(at))?new Intl.DateTimeFormat('en-US',{timeZone:timezone,month:'short',day:'numeric',year:'numeric'}).format(new Date(at)):'Not entered';
const localDay=(at:number,timezone:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at));
const zoneShort=(timezone:string)=>new Intl.DateTimeFormat('en-US',{timeZone:timezone,timeZoneName:'shortGeneric'}).formatToParts(new Date()).find(p=>p.type==='timeZoneName')?.value??timezone;
const lastDay=(month:string)=>{const [year,m]=month.split('-').map(Number);return new Date(Date.UTC(year!,m!,0)).toISOString().slice(0,10);};
/** One way to write a run of local calendar days: "Q4 2026 · Oct 1 – Dec 31, ET" (short: "Q4 2026"), otherwise "Oct 5 – Nov 2, 2026, ET". */
export function dayRange(first:string,last:string,timezone:string,short=false){
 const day=new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'short',day:'numeric'}),at=(d:string)=>day.format(new Date(`${d}T12:00:00Z`)),[fy,fm,fd]=first.split('-').map(Number) as [number,number,number],[ly,lm]=last.split('-').map(Number) as [number,number];
 const quarter=fd===1&&fy===ly&&fm%3===1&&lm===fm+2&&last===lastDay(last.slice(0,7));
 return quarter?`Q${(fm+2)/3} ${fy}${short?'':` · ${at(first)} – ${at(last)}, ${zoneShort(timezone)}`}`:fy===ly?`${at(first)} – ${at(last)}, ${fy}, ${zoneShort(timezone)}`:`${at(first)}, ${fy} – ${at(last)}, ${ly}, ${zoneShort(timezone)}`;
}
export const measuredNow=(measure:string)=>measure==='pipeline'||measure==='stage_age';
export const filtersPeriod=(filters:DashboardFilters,timezone:string)=>dayRange(filters.dateRange?.from??`${filters.from}-01`,filters.dateRange?.through??lastDay(filters.through),timezone);
/** Forecast views carry ISO dates with an exclusive end. */
export const forecastPeriod=(from:string,through:string,timezone:string,short=false)=>dayRange(from.slice(0,10),new Date(Date.parse(`${through.slice(0,10)}T12:00:00Z`)-86_400_000).toISOString().slice(0,10),timezone,short);
export function dashboardPeriod(view:SalesView){
 if(measuredNow(view.sections[0]?.measure??''))return view.saved?'Open when this result was measured':'Open now';
 return dayRange(localDay(Date.parse(view.period.from),view.timezone),localDay(Date.parse(view.period.through)-1,view.timezone),view.timezone);
}
export function dashboardAgo(at:string,now:number){const minutes=Math.max(0,Math.floor((now-Date.parse(at))/60000));return minutes<1?'just now':minutes<60?`${minutes} min ago`:`${Math.floor(minutes/60)} hr ago`;}
export function dashboardFreshness(view:SalesView,now:number){return view.saved?`Saved result measured ${dashboardLocal(view.asOf,view.timezone,true)}`:`Computed ${dashboardLocal(view.asOf,view.timezone)} · ${dashboardAgo(view.asOf,now)}`;}
export function dashboardZone(timezone:string){const name=new Intl.DateTimeFormat('en-US',{timeZone:timezone,timeZoneName:'longGeneric'}).formatToParts(new Date()).find(p=>p.type==='timeZoneName')?.value;return name&&name!==timezone?`${name} (${timezone})`:timezone;}
/** The first three pipelines of a report take the chart tokens in its own pipeline order; the rest are ink and rely on their labels. */
export function pipelineColor(view:SalesView){const order=[...view.filters.pipelines.map(p=>p.id),...view.stages.map(s=>s.pipelineId)].filter((id,index,all)=>all.indexOf(id)===index);return (id:string)=>{const index=order.indexOf(id);return index>=0&&index<3?`var(--ob-chart-${index+1})`:'var(--ob-ink)';};}
export const plural=(count:number|null,one:string,many:string)=>count===1?one:many;
