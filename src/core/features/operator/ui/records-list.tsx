import {Link} from '@tanstack/react-router';
import './record/record.css';
import {formatCurrency} from './formatters';
import {recordPath} from './records-query';
import type {CustomerRecord,RecordKind} from './records-api';

export function opportunityMeta(record:CustomerRecord,settings:any){return [record.company_name,record.stage_name??settings?.stages.find((stage:any)=>stage.id===record.stage_id)?.name,record.value_cents!==null&&record.value_cents!==undefined&&settings?.workspace?formatCurrency(record.value_cents,settings.workspace):undefined].filter(Boolean).join(' · ');}
const closedLabel=(record:CustomerRecord)=>record.lifecycle==='won'?'Won':record.lifecycle==='lost'?'Lost':null;
export function ClosedDealBadge({record}:{record:CustomerRecord}){const label=closedLabel(record);return label?<b className="r-chip">{label}</b>:null;}
/** Each row is a link to its record, so a middle click opens it in a new tab and Back returns to the list. */
export function RecordsList({kind,records,settings,selected,onSelected,readOnly=false,columns}:{kind:RecordKind;records:CustomerRecord[];settings:any;selected:string[];onSelected:(ids:string[])=>void;readOnly?:boolean;columns?:{key:string;label:string;archived:boolean}[]}){
 return <ol className="operator-queue__list records-list">{records.map(record=><li className="operator-queue-card" key={record.id}>
  <Link to={recordPath[kind]} params={{id:record.id}}><h2>{record.title??record.name??record.email}{kind==='opportunity'&&closedLabel(record)?<> <ClosedDealBadge record={record}/></>:null}</h2>{!columns?<p>{kind==='company'?record.primary_domain:kind==='contact'?[record.email||record.company_name,record.contactability==='do_not_contact'?'Do not contact':undefined].filter(Boolean).join(' · '):opportunityMeta(record,settings)}</p>:null}{columns?<dl className="saved-record-values">{columns.filter(column=>column.key!==(kind==='opportunity'?'title':'name')).map(column=>{const value=column.key.startsWith('custom:')?JSON.parse(record.custom_fields_json??'{}')[column.key.slice(7)]:column.key==='owner_name'?record.ownership?.ownerName??record.owner_name:record[column.key];return <div key={column.key}><dt>{column.label}{column.archived?' (archived, read-only)':''}</dt><dd>{value===null||value===undefined||value===''?'—':column.key==='value_cents'&&settings?.workspace?formatCurrency(value,settings.workspace):typeof value==='boolean'?(value?'Yes':'No'):String(value)}</dd></div>;})}</dl>:null}</Link>
  {!readOnly&&kind!=='opportunity'?<label className="record-selection record-selection--row"><input type="checkbox" aria-label={`Select ${record.name??record.email}`} checked={selected.includes(record.id)} onChange={event=>onSelected(event.target.checked?[...selected,record.id]:selected.filter(id=>id!==record.id))}/></label>:null}
 </li>)}</ol>;
}
