import {AccessError} from '../access/errors';
import type {ForecastState,ForecastPeriod,ForecastValues,ForecastResult,ForecastDeal,ForecastRep,RevenueSchedule,QuotaAttainment} from './types';

const empty=():ForecastValues=>({openUnweightedCents:0,weightedExpectedCents:0,committedCents:0,bestCaseCents:0,pipelineCents:0,omittedCents:0,wonBookingsCents:0,oneTimeScheduledCents:0,recurringScheduledCents:0,mrrCents:0,arrCents:0,unweightedMissingProbabilityCents:0});
const inPeriod=(date:string|null,period:ForecastPeriod)=>Boolean(date&&date>=period.from&&date<period.through);
function datePart(value:string|null,timezone:string){
 if(!value)return null;
 if(/^\d{4}-\d{2}-\d{2}$/.test(value)||timezone==='UTC')return value.slice(0,10);
 const instant=Date.parse(value);if(!Number.isFinite(instant))return null;
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(instant));
 return ['year','month','day'].map(type=>parts.find(part=>part.type===type)!.value).join('-');
}
/** Anchor each occurrence to its original day, clamping only that occurrence (Jan 31 -> Feb 28 -> Mar 31). */
export function calendarMonth(date:string,months:number){
 const year=Number(date.slice(0,4)),month=Number(date.slice(5,7))-1,day=Number(date.slice(8,10));
 const first=new Date(Date.UTC(year,month+months,1)),last=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
 first.setUTCDate(Math.min(day,last));return first.toISOString().slice(0,10);
}
function occurrences(schedule:RevenueSchedule,period:ForecastPeriod){
 if(schedule.kind==='one_time')return inPeriod(schedule.startDate,period)?1:0;
 const step=schedule.kind==='monthly'?1:schedule.kind==='quarterly'?3:12;
 const months=(Number(period.from.slice(0,4))-Number(schedule.startDate.slice(0,4)))*12+Number(period.from.slice(5,7))-Number(schedule.startDate.slice(5,7));
 let index=Math.max(0,Math.floor(months/step)-1),count=0;
 for(;;index++){if(Number(schedule.startDate.slice(0,4))+Math.floor((Number(schedule.startDate.slice(5,7))-1+index*step)/12)>9999)break;const date=calendarMonth(schedule.startDate,index*step);if(date>=period.through||(schedule.endDate!==null&&date>=schedule.endDate))break;if(date>=period.from)count++;}
 return count;
}
const quotaEnd=(start:string,period:'monthly'|'quarterly')=>calendarMonth(start,period==='monthly'?1:3);
const ratio=(bookings:number,quota:number)=>quota===0?null:bookings/quota*100;
function safe(values:ForecastValues){for(const value of Object.values(values))if(!Number.isFinite(value)||Math.abs(value)>Number.MAX_SAFE_INTEGER)throw new AccessError('validation','Forecast totals exceed the supported USD precision. Use a smaller period or amounts.');}

export function calculateForecast(state:ForecastState,period:ForecastPeriod,asOf:string,staleDays:number,timezone='UTC'):ForecastResult {
 const totals=empty(),reps=new Map<string|null,ForecastRep>(),stages=new Map(state.stageRules.map(rule=>[rule.stageId,rule])),inputs=new Map(state.dealInputs.map(input=>[input.dealId,input]));
 const rep=(id:string|null)=>{let result=reps.get(id);if(!result){result={operatorId:id,name:state.operators.find(o=>o.id===id)?.name??(id?'Former operator':'Unassigned'),totals:empty()};reps.set(id,result);}return result.totals;};
 const deals:ForecastDeal[]=state.deals.map(deal=>{
  const input=inputs.get(deal.id),stage=stages.get(deal.stage_id),probability=input?.probability??stage?.probability??null,category=input?.category??stage?.category??null;
  const closeDate=input?.closeDate??datePart(deal.expected_close_at,timezone),reviewedAt=input?.probability!==null&&input?.probability!==undefined?input.reviewedAt:stage?.reviewedAt??null;
  const result:ForecastDeal={deal,probability,category,closeDate,probabilitySource:input?.probability!==null&&input?.probability!==undefined?'deal':stage?'stage':'missing',reviewedAt,inPeriod:inPeriod(closeDate,period),weightedCents:probability===null?null:deal.value_cents*probability/100,warnings:[]};
  if(deal.lifecycle==='open'){
   if(!closeDate)result.warnings.push('missing_close_date');else if(closeDate<datePart(asOf,timezone)!)result.warnings.push('stale_close_date');
   if(probability===null)result.warnings.push('missing_probability');
   const reviews=[reviewedAt,...(input?[input.reviewedAt]:[])].filter((v):v is string=>v!==null);
   if(reviews.some(value=>Date.parse(asOf)-Date.parse(value)>staleDays*86400000))result.warnings.push('stale_review');
   if(!deal.owner_id)result.warnings.push('unassigned_owner');
  }
  for(const values of [totals,rep(deal.owner_id)]){
   if(deal.lifecycle==='open'&&result.inPeriod){
    values.openUnweightedCents+=deal.value_cents;
    if(probability===null)values.unweightedMissingProbabilityCents+=deal.value_cents;
    else values.weightedExpectedCents+=result.weightedCents!;
    if(category){const key=category==='best_case'?'bestCaseCents':`${category}Cents` as 'pipelineCents'|'committedCents'|'omittedCents';values[key]+=deal.value_cents;}
   }
   if(deal.lifecycle==='won'&&inPeriod(datePart(deal.closed_at,timezone),period))values.wonBookingsCents+=deal.value_cents;
   if(deal.lifecycle!=='lost')for(const schedule of input?.schedules??[]){
    const amount=occurrences(schedule,period)*schedule.amountCents;
    if(schedule.kind==='one_time')values.oneTimeScheduledCents+=amount;else{
     values.recurringScheduledCents+=amount;
     if(schedule.startDate<period.through&&(schedule.endDate===null||schedule.endDate>=period.through)){
      const monthly=schedule.amountCents/(schedule.kind==='monthly'?1:schedule.kind==='quarterly'?3:12);values.mrrCents+=monthly;values.arrCents+=monthly*12;
     }
    }
   }
  }
  return result;
 });
 const quotaAttainment:QuotaAttainment[]=state.quotas.filter(q=>q.startDate<period.through&&quotaEnd(q.startDate,q.period)>period.from).map(quota=>{
  const through=quotaEnd(quota.startDate,quota.period),wonBookingsCents=state.deals.filter(d=>d.owner_id===quota.operatorId&&d.lifecycle==='won'&&inPeriod(datePart(d.closed_at,timezone),{from:quota.startDate,through})).reduce((sum,d)=>sum+d.value_cents,0);
  if(!Number.isSafeInteger(wonBookingsCents))throw new AccessError('validation','Quota bookings exceed the supported USD precision.');
  return {quota,through,wonBookingsCents,attainmentPercent:ratio(wonBookingsCents,quota.amountCents)};
 });
 const quotaTotal=(kind:'monthly'|'quarterly')=>{const rows=quotaAttainment.filter(row=>row.quota.period===kind),amountCents=rows.reduce((sum,row)=>sum+row.quota.amountCents,0),wonBookingsCents=rows.reduce((sum,row)=>sum+row.wonBookingsCents,0);if(!Number.isSafeInteger(amountCents)||!Number.isSafeInteger(wonBookingsCents))throw new AccessError('validation','Quota totals exceed the supported USD precision.');return {amountCents,wonBookingsCents,attainmentPercent:ratio(wonBookingsCents,amountCents)};};
 for(const values of [totals,...[...reps.values()].map(r=>r.totals)])safe(values);
 return {...period,asOf,currency:'USD',basis:`USD sales forecast, not recognized accounting revenue. Dates use ${timezone} calendar days; from is inclusive and through exclusive. All open value (including omitted) is weighted by its reviewed probability; categories are separate, non-cumulative amounts. Scheduled amounts are calendar occurrences, separate from bookings. MRR/ARR are the run rate immediately before through. Quota attainment uses complete overlapping calendar quota periods; monthly and quarterly quotas are never added together.`,totals,reps:[...reps.values()],quotaAttainment,quotaTotals:{monthly:quotaTotal('monthly'),quarterly:quotaTotal('quarterly')},deals,inputs:state};
}
