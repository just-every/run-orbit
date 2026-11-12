import type {ForecastResult,ForecastValues,QuotaAttainment} from '../forecast/types';
import {forecastQuotaPeriods} from '../forecast/quota-periods';
import {percent,usd} from '../forecast/results';
import {formatDate} from '../operator/ui/formatters';

/** The forecast page's figures: the open-pipeline band with weighted expected value as its one key figure, quota attainment per
 * quota period (never added together), bookings and scheduled revenue, and the basis folded into one quiet line. */
const pipeline:[keyof ForecastValues,string][]=[['openUnweightedCents','Open unweighted value'],['committedCents','Committed'],['bestCaseCents','Best case'],['pipelineCents','Pipeline'],['omittedCents','Omitted']];
const bookings:[keyof ForecastValues,string][]=[['wonBookingsCents','Closed-won bookings'],['oneTimeScheduledCents','One-time scheduled revenue'],['recurringScheduledCents','Recurring scheduled revenue'],['mrrCents','MRR'],['arrCents','ARR'],['unweightedMissingProbabilityCents','Open value missing probability']];

export function ForecastBand({result}:{result:ForecastResult}){
 return <section className="reports-band" aria-label="Open pipeline"><dl>
  <div className="reports-key"><dt>Weighted expected value</dt><dd>{usd(result.totals.weightedExpectedCents)}</dd></div>
  {pipeline.map(([key,title])=><div key={key}><dt>{title}</dt><dd>{usd(result.totals[key])}</dd></div>)}
 </dl></section>;
}

function QuotaPeriod({result,period,rows}:{result:ForecastResult;period:'monthly'|'quarterly';rows:QuotaAttainment[]}){
 const totals=result.quotaTotals[period],amounts=new Set(rows.map(row=>row.quota.amountCents)),each=amounts.size===1?rows[0]!.quota.amountCents:null;
 const rep=(row:QuotaAttainment)=>result.inputs.operators.find(item=>item.id===row.quota.operatorId)?.name??row.quota.operatorId,repeated=(row:QuotaAttainment)=>rows.filter(other=>other.quota.operatorId===row.quota.operatorId).length>1;
 return <div className="reports-quota">
  <p className="reports-quota__total"><span>{period==='monthly'?'Monthly quotas':'Quarterly quotas'}</span> <strong>{usd(totals.amountCents)}</strong></p>
  <p>Closed-won {usd(totals.wonBookingsCents)} · {totals.attainmentPercent===null?percent(null):`${percent(totals.attainmentPercent)} attainment`}</p>
  <h4>{each===null?'Per rep':`Per rep (${period} quota ${usd(each)} each)`}</h4>
  <ul className="reports-reps">{rows.map(row=><li key={row.quota.id}>
   <span>{rep(row)}{repeated(row)?` · from ${row.quota.startDate}`:''}{each===null?` · ${usd(row.quota.amountCents)} quota`:''}</span>
   <span className="reports-bar" aria-hidden="true"><span style={{width:`${Math.min(row.attainmentPercent??0,100)}%`}}/></span>
   <span>{percent(row.attainmentPercent)}</span>
  </li>)}</ul>
 </div>;
}
export function QuotaGroup({result}:{result:ForecastResult}){
 const periods=forecastQuotaPeriods(result);
 return <section className="reports-group" aria-labelledby="forecast-quota-title"><h2 id="forecast-quota-title">Quota attainment</h2>
  {!periods.length?<p>No reviewed quotas overlap this forecast period.</p>:periods.map(item=><QuotaPeriod key={item.period} result={result} period={item.period} rows={item.rows}/>)}
 </section>;
}

export function BookingsGroup({result}:{result:ForecastResult}){
 return <section className="reports-group reports-group--ruled" aria-labelledby="forecast-bookings-title"><h2 id="forecast-bookings-title">Bookings and scheduled revenue</h2>
  <dl className="reports-ruled">{bookings.map(([key,title])=><div key={key}><dt>{title}</dt><dd>{usd(result.totals[key])}</dd></div>)}</dl>
 </section>;
}

/** The engine's basis, the UTC-day rule and the two notes, word for word, folded under one line. */
export function ForecastBasis({result,busy,saved}:{result:ForecastResult;busy:boolean;saved:boolean}){
 return <details className="reports-basis"><summary>{busy?'Computing…':['Basis',`As of ${formatDate(result.asOf)}`,`${result.from} until ${result.through} (excluded)`,'USD',saved?'Saved':'Not saved'].join(' · ')}</summary>
  <p>{result.basis}</p>
  <p>Dates use UTC calendar days: from is included; through is excluded.</p>
  <p>Weighted expected value = open deal amount × reviewed probability. Engagement scores do not affect it. Sales forecast and scheduled revenue are not recognized accounting revenue.</p>
  <p>Attainment compares closed-won bookings with the quota’s complete calendar period. Monthly and quarterly totals stay separate.</p>
 </details>;
}
