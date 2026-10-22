import type {SalesView} from '../analytics/sales-view';
export const dashboardLocal=(at:string,timezone:string,date=false)=>new Intl.DateTimeFormat('en-US',{timeZone:timezone,...(date?{month:'short',day:'numeric',year:'numeric'} as const:{}),hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(at));
export function dashboardPeriod(view:SalesView){
 const measure=view.sections[0]?.measure;if(measure==='pipeline'||measure==='stage_age')return view.saved?'Open when this result was measured':'Open now';
 const first=view.period.fromMonth,last=view.period.throughMonth,quarter=first.slice(0,4)===last.slice(0,4)&&Number(first.slice(5))%3===1&&Number(last.slice(5))-Number(first.slice(5))===2?`Q${Math.ceil(Number(first.slice(5))/3)} ${first.slice(0,4)} · `:'';
 const date=new Intl.DateTimeFormat('en-US',{timeZone:view.timezone,month:'short',day:'numeric'}),zone=new Intl.DateTimeFormat('en-US',{timeZone:view.timezone,timeZoneName:'shortGeneric'}).formatToParts(new Date(view.asOf)).find(p=>p.type==='timeZoneName')?.value??view.timezone;
 return `${quarter}${date.format(new Date(view.period.from))} – ${date.format(new Date(Date.parse(view.period.through)-1))}, ${zone}`;
}
export function dashboardFreshness(view:SalesView){if(view.saved)return `Saved result measured ${dashboardLocal(view.asOf,view.timezone,true)}`;const minutes=Math.max(0,Math.floor((Date.now()-Date.parse(view.asOf))/60000));return `Computed ${dashboardLocal(view.asOf,view.timezone)} · ${minutes?`${minutes} min ago`:'just now'}`;}
export function dashboardZone(timezone:string){const name=new Intl.DateTimeFormat('en-US',{timeZone:timezone,timeZoneName:'longGeneric'}).formatToParts(new Date()).find(p=>p.type==='timeZoneName')?.value;return name&&name!==timezone?`${name} (${timezone})`:timezone;}
