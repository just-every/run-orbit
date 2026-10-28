import {reportFieldLabel} from './report-field-labels';
import {label} from '../operator/ui/formatters';
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
   <div><dt>Period</dt><dd>{report.from} to {report.through}<br/>{measurement.periodKind==='current-population'?'Current open population read during this review; no record date filter.':`${reportFieldLabel(measurement.dateField??'created_at')}: start included, end excluded.`}</dd></div>
   <div><dt>Filters</dt><dd>{filters.length?<ul>{filters.map(([field,value])=><li key={field}>{reportFieldLabel(field)}: {field==='owner_id'&&value===null?'Unassigned':typeof value==='string'?['lifecycle','band','queue_state','contactability'].includes(field)?label(value):<details><summary>Saved filter value</summary><DataValue value={value}/></details>:<DataValue value={value}/>}</li>)}</ul>:'None'}</dd></div>
   <div><dt>Grouping</dt><dd>{measurement.groupBy?reportFieldLabel(measurement.groupBy):'All records'}</dd></div>
   <div><dt>Missing values</dt><dd>{measurement.missingHandling}<br/>Missing numeric values: {String(report.values.missing??0)}. Unavailable dates: {String(report.values.invalidDates??0)}.</dd></div>
   <div><dt>Unit</dt><dd>{measurement.valueField&&!measurement.currency?reportFieldLabel(measurement.unit):measurement.unit}</dd></div>
  </dl>
  {Array.isArray(groups)&&groups.length>0&&<ul aria-label="Report groups">{groups.map((value,index)=>{
   const group=value as Record<string,Json>;
   return <li key={index}>{String(group.label)}: {reportValue(report,group.value)} ({String(group.n)} source records, {String(group.missing)} missing){Array.isArray(group.records)&&<details><summary>Source records in this group</summary><ul>{(group.records as {type:string;id:string}[]).map(record=><li key={`${record.type}:${record.id}`}><a href={`/app/shared-records?${new URLSearchParams({kind:record.type,id:record.id})}`}>Open {record.type}</a></li>)}</ul></details>}</li>;
  })}</ul>}
 </div>;
}
