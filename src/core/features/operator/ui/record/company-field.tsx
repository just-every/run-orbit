import {useState} from 'react';
import {AutosaveField,labelId} from '../autosave/field';
import type {AutosaveForm} from '../autosave/use-autosave';
import {useRecordMatches} from '../record-link-picker';

/** Company: a search that offers companies as you type and saves on choice; emptied and left, it clears. */
export function CompanyField({form,field,name,label='Company'}:{form:AutosaveForm;field:string;name:string;label?:string}){
 const [query,setQuery]=useState<string|null>(null),[chosen,setChosen]=useState<string|null>(null),{matches}=useRecordMatches('company',query??'');
 function choose(id:string|null,label:string){setChosen(label);setQuery(null);form.commit(field,id);}
 const shown=query??(form.status(field).state==='saving'&&chosen!==null?chosen:name);
 return <AutosaveField form={form} field={field} label={label} quiet describe={()=>name||'no company'}
  after={query?.trim()&&matches.length?<ul className="record-link-picker__results" aria-label={`${label}: matches`}>{matches.slice(0,8).map(company=><li key={company.id}><button type="button" onMouseDown={event=>event.preventDefault()} onClick={()=>choose(company.id,company.name??'')}><strong>{company.name}</strong>{company.primary_domain?<span>{company.primary_domain}</span>:null}</button></li>)}</ul>:null}>
  <input type="search" aria-labelledby={labelId(form,field)} autoComplete="off" placeholder="Add a company" value={shown} onChange={event=>setQuery(event.target.value)} onBlur={()=>{if(query!==null&&!query.trim()&&name)choose(null,'');else setTimeout(()=>setQuery(null),200);}} onKeyDown={event=>{if(event.key==='Escape')setQuery(null);}}/>
 </AutosaveField>;
}
