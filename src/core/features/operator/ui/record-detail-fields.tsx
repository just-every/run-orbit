import {DataValue,fieldLabel} from './data-value';
import {formatCurrency,formatDateTime} from './formatters';
import {customFieldValue} from './import-provenance';
import {recordWords} from './record-presentation';
import type {CustomerRecord} from './records-api';

export function RecordDetailFields({record,workspace}:{record:CustomerRecord;workspace:any}){
 const fields=recordWords(Object.fromEntries(Object.entries(record).filter(([key])=>!['custom_fields_json','email_key','primary_domain_key','closed_by'].includes(key)))) as Record<string,unknown>??{};
 const custom=Object.fromEntries(Object.entries(JSON.parse(record.custom_fields_json??'{}')).map(([key,value])=>[key,customFieldValue(key,value)]));
 return <dl className="records-detail-list">
  {Object.entries(fields).map(([key,value])=><div key={key}><dt>{key==='value_cents'?'Estimated value':fieldLabel(key)}</dt><dd>{key==='value_cents'&&workspace?formatCurrency(Number(value),workspace):key.endsWith('_at')&&workspace?formatDateTime(String(value),workspace):<DataValue value={value}/>}</dd></div>)}
  {Object.entries(custom).map(([key,value])=>{const words=recordWords(value);return words===undefined?null:<div key={key}><dt>{fieldLabel(key)}</dt><dd><DataValue value={words}/></dd></div>;})}
 </dl>;
}
