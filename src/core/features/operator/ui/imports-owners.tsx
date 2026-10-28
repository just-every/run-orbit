import {parseCsv} from '../../../shared/csv';
import type {ImportInput} from '../../imports/contracts';
import type {ImportOwner} from '../../imports/owners';

/** Source values are counted before review; the server saves the final resolution. */
export function ImportOwnerMapping({files,owners,mapping,onChange}:{files:ImportInput['files'];owners:ImportOwner[];mapping:Record<string,string|null>;onChange:(mapping:Record<string,string|null>)=>void}){
 const counts=new Map<string,number>();
 for(const file of files.filter(file=>['contact','company'].includes(file.kind)&&file.mapping.owner)){
  const [headers,...rows]=parseCsv(file.csv.replace(/^\uFEFF/,'')),column=headers?.indexOf(file.mapping.owner)??-1;
  for(const row of rows){const value=row[column]?.trim();if(value)counts.set(value,(counts.get(value)??0)+1);}
 }
 if(!counts.size)return null;
 return <fieldset aria-label="Import owner mapping"><legend>Contact and company owners</legend><p>Exact user emails match automatically. Choose an active Orbit user for other values, or leave them unassigned. Mapping never grants access. These reviewed owner values also apply to existing records.</p><div className="crm-field-grid">{[...counts].map(([value,count])=>{
  const automatic=owners.find(owner=>owner.email===value),selected=Object.hasOwn(mapping,value)?mapping[value]:automatic?.id;
  return <label key={value}>{value} · {count} {count===1?'row':'rows'}{!selected?<span>{Object.hasOwn(mapping,value)?'Will be unassigned':'Unmatched · will stay unassigned'}</span>:null}<select aria-label={`Owner for ${value}`} value={selected??''} onChange={event=>onChange({...mapping,[value]:event.target.value||null})}><option value="">Unassigned</option>{owners.map(owner=><option key={owner.id} value={owner.id}>{owner.display_name} ({owner.email})</option>)}</select></label>;
 })}</div></fieldset>;
}
export function ImportOwnerReview({owners}:{owners?:{value:string;count:number;ownerName:string|null;explicit?:boolean}[]}){
 if(!owners?.length)return null;
 return <section aria-label="Reviewed import owners"><h3>Reviewed owners</h3><p>These assignments are saved in this dry run. Unmatched values never assign the importer.</p><ul className="crm-results">{owners.map(owner=><li key={owner.value}>{owner.value} · {owner.count} {owner.count===1?'row':'rows'} → {owner.ownerName??(owner.explicit?'Unassigned':'Unmatched · Unassigned')}</li>)}</ul></section>;
}
