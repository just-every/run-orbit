import {formatCurrency} from './formatters';
import type {CustomerRecord,RecordKind} from './records-api';

export function opportunityMeta(record:CustomerRecord,settings:any){return [record.company_name,record.stage_name??settings?.stages.find((stage:any)=>stage.id===record.stage_id)?.name,record.value_cents!==null&&record.value_cents!==undefined&&settings?.workspace?formatCurrency(record.value_cents,settings.workspace):undefined].filter(Boolean).join(' · ');}
export function RecordsList({kind,records,settings,selected,onSelected,onOpen,grouped=false}:{kind:RecordKind;records:CustomerRecord[];settings:any;grouped?:boolean;selected:string[];onSelected:(ids:string[])=>void;onOpen:(id:string)=>void}){
 const list=(items:CustomerRecord[])=><ol className="operator-queue__list records-list">{items.map(record=><li className="operator-queue-card" key={record.id}>

  <button onClick={()=>onOpen(record.id)}><h2>{record.title??record.name??record.email}</h2><p>{kind==='company'?record.primary_domain:kind==='contact'?[record.email||record.company_name,record.contactability==='do_not_contact'?'Do not contact':undefined].filter(Boolean).join(' · '):opportunityMeta(record,settings)}</p>{kind!=='opportunity'?<p>Owner: {record.ownership?.ownerName??'Unassigned'}</p>:null}</button>
  {kind!=='opportunity'?<label className="record-selection record-selection--row"><input type="checkbox" aria-label={`Select ${record.name??record.email}`} checked={selected.includes(record.id)} onChange={event=>onSelected(event.target.checked?[...selected,record.id]:selected.filter(id=>id!==record.id))}/></label>:null}
 </li>)}</ol>;
 if(!grouped)return list(records);
 const groups=new Map<string,{name:string;records:CustomerRecord[]}>();
 for(const record of records){const key=record.ownership?.ownerId??'unassigned',group:{name:string;records:CustomerRecord[]}=groups.get(key)??{name:record.ownership?.ownerName??'Unassigned',records:[]};group.records.push(record);groups.set(key,group);}
 return <>{[...groups].sort(([,a],[,b])=>a.name.localeCompare(b.name)).map(([key,group])=><section key={key} aria-label={`${group.name} records`}><h2>{group.name}</h2>{list(group.records)}</section>)}</>;
}
