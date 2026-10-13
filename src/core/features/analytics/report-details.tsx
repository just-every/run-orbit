import {DataValue} from '../operator/ui/data-value';
import type {Json,MetricSnapshot} from '../../shared/expansion-contracts';
import {reportValue} from './report-format';
export {reportValue} from './report-format';

export function ReportDetails({report}:{report:MetricSnapshot}) {
 const measurement=report.measurement;
 if(!measurement)return <p>The saved measurement context is unavailable.</p>;
 const filters=Object.entries(measurement.filters),groups=report.values.groups;
 return <div className="analytics-console__measurement">
  <dl>
   <div><dt>Period</dt><dd>{report.from} to {report.through}<br/>{measurement.periodKind==='current-population'?'Current open population read during this review; no record date filter.':`${measurement.dateField}: start included, end excluded.`}</dd></div>
   <div><dt>Filters</dt><dd>{filters.length?<ul>{filters.map(([field,value])=><li key={field}>{field}: <DataValue value={value}/></li>)}</ul>:'None'}</dd></div>
   <div><dt>Grouping</dt><dd>{measurement.groupBy??'All records'}</dd></div>
   <div><dt>Missing values</dt><dd>{measurement.missingHandling}<br/>Missing numeric values: {String(report.values.missing??0)}. Unavailable dates: {String(report.values.invalidDates??0)}.</dd></div>
   <div><dt>Unit</dt><dd>{measurement.unit}</dd></div>
  </dl>
  {Array.isArray(groups)&&groups.length>0&&<ul aria-label="Report groups">{groups.map((value,index)=>{
   const group=value as Record<string,Json>;
   return <li key={index}>{String(group.label)}: {reportValue(report,group.value)} ({String(group.n)} source records, {String(group.missing)} missing)</li>;
  })}</ul>}
 </div>;
}
