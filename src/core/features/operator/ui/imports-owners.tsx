import {parseCsv} from '../../../shared/csv';
import type {ImportInput} from '../../imports/contracts';

export function sourceOwnerNames(files:ImportInput['files']){
 return [...new Set(files.filter(file=>['contact','company','deal'].includes(file.kind)).flatMap(file=>{
  const [headers=[],...rows]=parseCsv(file.csv.replace(/^\uFEFF/,'')),column=headers.indexOf(file.mapping.owner??'');
  return column<0?[]:rows.map(row=>(row[column]??'').trim()).filter(Boolean);
 }))].sort();
}

export function ImportOwnerFields({files,owners,setOwners,operators}:{files:ImportInput['files'];owners:Record<string,string>;setOwners:(owners:Record<string,string>)=>void;operators:{id:string;display_name:string;status:string;collaborator?:boolean|number}[]}){
 const names=sourceOwnerNames(files);
 if(!names.length)return null;
 return <fieldset className="crm-owner-mapping"><legend>Assign imported records</legend>
  <p>Match owners in your file to active Orbit users. Unmapped owners stay in the import history; new records remain unassigned. Your current record and field permissions apply to every assignment.</p>
  <div className="crm-field-grid">{names.map(name=><label key={name}>Orbit owner for {name}<select value={owners[name]??''} onChange={event=>{const next={...owners};if(event.target.value)next[name]=event.target.value;else delete next[name];setOwners(next);}}>
   <option value="">Leave unassigned</option>{operators.filter(person=>person.status==='active'&&!person.collaborator).map(person=><option key={person.id} value={person.id}>{person.display_name}</option>)}
  </select></label>)}</div>
 </fieldset>;
}
