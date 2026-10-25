import {cellValue} from '../analytics/sales-format';
import {usd,percent} from '../forecast/results';
import type {DashboardView,TileResult} from './repository';
export const unavailableText="This tile's source was deleted, is no longer shared with you, or needs access you don't have. Nothing from it is shown.";
export interface ExportTile{id:string;title:string;width:number;height:number;lines:string[]}
/** All export numbers use the same Cell and forecast formatters as the board. */
export function dashboardExportTile(tile:TileResult,access:string,view:DashboardView):ExportTile{
 if(tile.status==='loading')throw new Error('Exports require a computed dashboard.');
 if(tile.status==='unavailable')return {id:tile.id,title:'Unavailable tile',width:tile.width,height:1,lines:[unavailableText,access]};
 if(tile.status==='error')return {id:tile.id,title:'Tile could not be computed',width:tile.width,height:tile.height,lines:[tile.message,access]};
 const {report,forecast,notes}=tile,lines:string[]=[];
 if(report){
  lines.push(`Version ${report.definitionVersion}`,report.freshness);
  for(const section of report.sections){if(section.measure==='win_rate'){const rate=section.totals.find(cell=>cell.key==='rate');if(rate)lines.push(`${section.totals.find(cell=>cell.key==='won')?.value??0} won of ${rate.rows.length} closed`);}for(const cell of section.totals)lines.push(`${cell.label}: ${cellValue(cell,report.currency)}`);for(const table of section.tables)for(const group of table.groups)for(const cell of group.cells)lines.push(`${table.title} / ${group.label} / ${cell.label}: ${cellValue(cell,report.currency)}`);for(const group of section.months)for(const cell of group.cells)lines.push(`${group.label} / ${cell.label}: ${cellValue(cell,report.currency)}`);if(section.withheld)lines.push(section.withheld);}
  lines.push(...notes,...report.missing,'Basis',`Period: ${report.period.fromMonth} to ${report.period.throughMonth} (${report.period.from} to ${report.period.through}, excluded)`,`Timezone: ${report.timezone}`,`Currency: ${report.currency}`,`Filters: ${report.filters.pipelines.map(p=>p.name).join(', ')||'All pipelines'}; ${report.definition.repIds.length?'Owner filter applied':'All owners'}. ${report.filters.notes.join(' ')} ${notes.join(' ')}`,`Access: ${access}`,`Freshness: ${report.freshness}`,`Missing data: ${report.missing.join(' ')||'None recorded.'}`);
  for(const section of report.sections)lines.push(section.definition,`Source fields: ${section.sources.join(', ')}`);
  if(report.late?.sections.length){lines.push('Late-arriving evidence',report.late.note);for(const section of report.late.sections)for(const cell of section.cells)lines.push(`${cell.group?cell.group+' / ':''}${cell.label}: +${cellValue(cell,report.currency)}`);}
  return {id:tile.id,title:report.sections[0]?.title??report.name,width:tile.width,height:tile.height,lines};
 }
 if(forecast){const r=forecast.result,q=r.quotaTotals.quarterly;lines.push(`Quota: ${usd(q.amountCents)}`,`Weighted expected value: ${usd(r.totals.weightedExpectedCents)}`,`Closed-won bookings: ${usd(r.totals.wonBookingsCents)}`,`Attainment: ${percent(q.attainmentPercent)}`,`Open unweighted value: ${usd(r.totals.openUnweightedCents)}`);for(const rep of r.quotaAttainment.filter(q=>q.quota.period==='quarterly'))lines.push(`${r.inputs.operators.find(o=>o.id===rep.quota.operatorId)?.name??'Former operator'}: ${percent(rep.attainmentPercent)}`);lines.push('Basis',`Period: ${forecast.from} to ${forecast.through} (excluded)`,`Timezone: ${tile.tile.version==='live'?view.timezone:'UTC'}`,'Currency: USD',`Filters: ${tile.tile.version==='live'?JSON.stringify(view.filters):'Saved result; dashboard filters not applied.'}`,`Source fields: opportunities.lifecycle, opportunities.expected_close_at, opportunities.closed_at, opportunities.value_cents, opportunities.owner_id, reviewed forecast probabilities, categories and quotas`,...r.deals.flatMap(deal=>deal.warnings.map(warning=>`${deal.deal.title}: ${warning.replaceAll('_',' ')}`)),`Freshness: ${tile.tile.version==='live'?'Computed':'Saved result measured'} ${r.asOf}`,`Access: ${access}`,...notes,r.basis,'Weighted expected value = open deal amount × reviewed probability. Engagement scores do not affect it.','Sales forecast and scheduled revenue are not recognized accounting revenue.');}
 return {id:tile.id,title:'Forecast vs quota',width:tile.width,height:tile.height,lines};
}
const quote=(value:string)=>'"'+(/^[=+@\-\t\r]/.test(value)?"'"+value:value).replaceAll('"','""')+'"';
export function dashboardTileCsv(tile:TileResult,view:DashboardView){
 if(tile.status!=='ready')return [['Unavailable tile',unavailableText].map(quote).join(',')].join('\r\n');
 const exportTile=dashboardExportTile(tile,view.access,view);
 return [['Tile',exportTile.title],['Access',view.access],...exportTile.lines.map(line=>['Figure or basis',line])].map(row=>row.map(quote).join(',')).join('\r\n')+'\r\n';
}
