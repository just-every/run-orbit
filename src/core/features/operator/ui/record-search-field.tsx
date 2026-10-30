import {useId,useState} from 'react';
import {useRecordMatches} from './record-link-picker';
import type {CustomerRecord} from './records-api';

/** One search field that offers matching records under it as you type; choosing one hands it over and empties the field. */
export function RecordSearchField({kind,label,placeholder,exclude=[],onChoose,disabled=false,className}:{kind:'contact'|'company';label:string;placeholder?:string;exclude?:string[];onChoose:(record:CustomerRecord)=>void;disabled?:boolean;className?:string}){
 const [query,setQuery]=useState(''),resultsId=useId(),{matches,loading,error}=useRecordMatches(kind,query);
 const available=query.trim()?matches.filter(record=>!exclude.includes(record.id)):[];
 return <div className={`record-link-picker record-search-field ${className??''}`}>
  <input type="search" maxLength={500} placeholder={placeholder??label} autoComplete="off" aria-label={label} value={query} disabled={disabled} aria-controls={resultsId} onChange={event=>setQuery(event.target.value)}/>
  <ul id={resultsId} className="record-link-picker__results" aria-label={`${label}: matches`}>{available.map(record=><li key={record.id}><button type="button" disabled={disabled} onClick={()=>{setQuery('');onChoose(record);}}><strong>{record.name||record.email||'Unnamed'}</strong>{kind==='contact'&&record.email&&record.name?<span>{record.email}</span>:kind==='company'&&record.primary_domain?<span>{record.primary_domain}</span>:null}</button></li>)}</ul>
  {error?<p role="alert">{error}</p>:query.trim()&&loading?<p className="record-link-picker__status" role="status">Searching…</p>:query.trim()&&!available.length?<p className="record-link-picker__status" role="status">No matches.</p>:null}
 </div>;
}
