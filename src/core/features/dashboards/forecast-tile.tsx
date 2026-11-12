import type {CSSProperties} from 'react';
import {forecastQuotaPeriods} from '../forecast/quota-periods';
import {usd,percent} from '../forecast/results';
import type {ForecastResult,ForecastSnapshot} from '../forecast/types';
import {dashboardLocal,dashboardZone,forecastPeriod} from './display';
/** FORECAST-001's measures and quota periods stay separate, with attainment against each rep's own target. */
export function ForecastTile({result,onOpen}:{result:ForecastResult;onOpen:()=>void}){
 const periods=forecastQuotaPeriods(result);
 const figure=(text:string,label:string)=><button type="button" className="sales-cell" aria-label={`${text} ${label}: show the forecast deals behind it`} onClick={onOpen}>{text}</button>;
 return <><dl className="dash-forecast">
  {!periods.length&&<div><dt>Quota</dt><dd>{figure(usd(0),'Quota')}</dd><dd className="dash-forecast__note">No quota set</dd></div>}
  {periods.map(({period,totals})=><div key={period}><dt>{period==='monthly'?'Monthly quota':'Quarterly quota'}</dt><dd>{figure(usd(totals.amountCents),`${period} quota`)}</dd><dd className="dash-forecast__note">{totals.attainmentPercent===null?'No quota amount':`${percent(totals.attainmentPercent)} attainment`}</dd></div>)}
  <div><dt>Weighted expected value</dt><dd>{figure(usd(result.totals.weightedExpectedCents),'Weighted expected value')}</dd></div><div><dt>Closed-won bookings</dt><dd>{figure(usd(result.totals.wonBookingsCents),'Closed-won bookings')}</dd></div><div><dt>Open unweighted value</dt><dd>{figure(usd(result.totals.openUnweightedCents),'Open unweighted value')}</dd></div></dl>
  {periods.map(({period,rows})=>{const each=rows.every(row=>row.quota.amountCents===rows[0]!.quota.amountCents);return <section key={period}><h3 className="dash-forecast__reps">Per rep ({period} quota{each?` ${usd(rows[0]!.quota.amountCents)} each`:''})</h3><ul className="dash-reps">{rows.map(q=><li className="dash-rep" key={q.quota.id}><span>{result.inputs.operators.find(p=>p.id===q.quota.operatorId)?.name??'Former operator'}{rows.filter(row=>row.quota.operatorId===q.quota.operatorId).length>1?` · from ${q.quota.startDate}`:''}{!each?` · ${usd(q.quota.amountCents)} quota`:''}</span><span className="dash-bar" aria-hidden="true"><span style={{width:`${Math.max(0,Math.min(100,q.attainmentPercent??0))}%`,'--pipeline-color':'var(--ob-tangerine)'} as CSSProperties}/></span><span>{percent(q.attainmentPercent)}</span></li>)}</ul></section>;})}
  <p className="dash-meta">Weighted expected value = open deal amount × reviewed probability. Engagement scores do not affect it.</p></>;
}
export function ForecastBasis({forecast,live,notes,access,timezone}:{forecast:ForecastSnapshot;live:boolean;notes:string[];access:string;timezone:string}){
 const warnings=forecast.result.deals.some(deal=>deal.warnings.length);
 return <dl className="sales-basis dash-basis"><div><dt>Period</dt><dd>{forecastPeriod(forecast.from,forecast.through,timezone)}</dd></div><div><dt>Timezone</dt><dd>{dashboardZone(timezone)}</dd></div><div><dt>Currency</dt><dd>USD, from each deal amount; no exchange rates.</dd></div><div><dt>Filters</dt><dd>{notes.length?notes.join(' '):'Every dashboard filter applies.'}</dd></div><div><dt>Access</dt><dd>{access}</dd></div><div><dt>Freshness</dt><dd>{live?`Computed ${dashboardLocal(forecast.result.asOf,timezone)} from current records`:`Saved result measured ${dashboardLocal(forecast.result.asOf,timezone,true)}`}</dd></div><div><dt>Missing data</dt><dd>{warnings?'Some forecast inputs need attention; open the figures to inspect their recorded warnings.':'None recorded.'}</dd></div><div><dt>Definition</dt><dd>{forecast.result.basis} Sales forecast and scheduled revenue are not recognized accounting revenue.<span className="sales-sources">Source fields: opportunities.value_cents, opportunities.expected_close_at, opportunities.closed_at, opportunities.owner_id, forecast_revisions probability, category and quotas.</span></dd></div></dl>;
}
