import {useEffect,useId,useRef,useState} from 'react';
import {ActionTooltip} from './action-tooltip';
import {recordsRequest,type CustomerRecord} from './records-api';

function useRecordMatches(kind:'company'|'contact',query:string) {
 const [matches,setMatches]=useState<CustomerRecord[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  let current=true;
  setMatches([]);setError('');
  if(!query.trim()){setLoading(false);return;}
  setLoading(true);
  const timer=setTimeout(()=>{
   void recordsRequest<{records:CustomerRecord[]}>(`records/${kind}?q=${encodeURIComponent(query.trim())}`).then(result=>{if(current)setMatches(result.records);}).catch(reason=>{if(current)setError((reason as Error).message);}).finally(()=>{if(current)setLoading(false);});
  },180);
  return()=>{current=false;clearTimeout(timer);};
 },[kind,query]);
 return {matches,loading,error};
}

function MatchStatus({query,loading,error,empty}:{query:string;loading:boolean;error:string;empty:boolean}) {
 if(error)return <p role="alert">{error}</p>;
 if(!query.trim()||(!loading&&!empty))return null;
 return <p className="record-link-picker__status" role="status">{loading?'Searching…':empty?'No matching records.':null}</p>;
}

export function ContactPicker({contacts,ids,primaryId,onChange,disabled=false}:{contacts:CustomerRecord[];ids:string[];primaryId:string|null;onChange:(ids:string[],primaryId:string|null)=>void;disabled?:boolean}) {
 const [query,setQuery]=useState(''),[chosen,setChosen]=useState<CustomerRecord[]>([]),input=useRef<HTMLInputElement>(null),resultsId=useId();
 const {matches,loading,error}=useRecordMatches('contact',query),known=new Map([...contacts,...chosen,...matches].map(contact=>[contact.id,contact])),available=query.trim()?matches.filter(contact=>!ids.includes(contact.id)):[];
 function add(contact:CustomerRecord) {
  setChosen(previous=>[...previous.filter(item=>item.id!==contact.id),contact]);
  onChange([...ids,contact.id],primaryId||contact.id);setQuery('');input.current?.focus();
 }
 function remove(id:string) {
  const remaining=ids.filter(value=>value!==id);
  onChange(remaining,remaining.includes(primaryId??'')?primaryId:remaining[0]??null);input.current?.focus();
 }
 const name=(contact:CustomerRecord|undefined)=>contact?.name||contact?.email||'Contact unavailable';
 return <div className="record-link-picker">
  <label>Find contacts<input ref={input} type="search" maxLength={500} placeholder="Search by name or email" autoComplete="off" value={query} disabled={disabled} aria-controls={resultsId} onChange={event=>setQuery(event.target.value)}/></label>
  <ul id={resultsId} className="record-link-picker__results" aria-label="Contact search results">{available.map(contact=><li key={contact.id}><button type="button" disabled={disabled} onClick={()=>add(contact)}><strong>{name(contact)}</strong>{contact.email&&contact.name?<span>{contact.email}</span>:null}</button></li>)}</ul>
  <MatchStatus query={query} loading={loading} error={error} empty={!available.length}/>
  {ids.length?<><ul className="record-link-picker__chips" aria-label="Associated contacts">{ids.map(id=><li className="record-link-picker__chip" key={id}><span>{name(known.get(id))}{id===primaryId?' · Primary':''}</span><ActionTooltip label="Remove contact"><button className="record-link-picker__remove" type="button" disabled={disabled} onClick={()=>remove(id)}><span aria-hidden="true">×</span></button></ActionTooltip></li>)}</ul>
  <label>Primary recipient<select aria-label="Primary recipient" required value={primaryId??''} disabled={disabled} onChange={event=>onChange(ids,event.target.value)}>{!primaryId?<option value="">Not set</option>:null}{ids.map(id=><option key={id} value={id}>{name(known.get(id))}</option>)}</select></label></>:null}
 </div>;
}

export function CompanySearch({name,companyId,onChange,disabled=false}:{name:string;companyId:string;onChange:(name:string,id:string)=>void;disabled?:boolean}) {
 const input=useRef<HTMLInputElement>(null),restoreFocus=useRef(false),resultsId=useId(),query=companyId?'':name,{matches,loading,error}=useRecordMatches('company',query);
 useEffect(()=>{if(!companyId&&restoreFocus.current){input.current?.focus();restoreFocus.current=false;}},[companyId]);
 return <div className="record-link-picker">
  {companyId?<div className="record-link-picker__chip"><span>{name}</span><ActionTooltip label="Remove company"><button className="record-link-picker__remove" type="button" disabled={disabled} onClick={()=>{restoreFocus.current=true;onChange('','');}}><span aria-hidden="true">×</span></button></ActionTooltip></div>:<>
   <label>Company name<input ref={input} type="search" maxLength={200} placeholder="Search or enter a company name" autoComplete="off" required value={name} disabled={disabled} aria-controls={resultsId} onChange={event=>onChange(event.target.value,'')}/></label>
   <ul id={resultsId} className="record-link-picker__results" aria-label="Company search results">{(query.trim()?matches:[]).map(company=><li key={company.id}><button type="button" disabled={disabled} onClick={()=>onChange(company.name??'',company.id)}><strong>{company.name}</strong>{company.primary_domain?<span>{company.primary_domain}</span>:null}</button></li>)}</ul>
   {error?<p role="alert">{error}</p>:loading?<p className="record-link-picker__status" role="status">Searching…</p>:null}
  </>}
 </div>;
}
