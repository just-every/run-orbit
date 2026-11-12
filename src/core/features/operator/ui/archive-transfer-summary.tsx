import {decodeTime} from 'ulidx';
import {useState} from 'react';
import {formatDateTime} from './formatters';
import type {ArchiveStatus} from './archive-transfer';

/** Transfer IDs are generated at job creation. Reading their timestamp preserves the native archive wire contract. */
export function transferStartedAt(status:ArchiveStatus):string|undefined{
 try{return new Date(decodeTime(status.id)).toISOString();}catch{return undefined;}
}
export function transferLabel(status:ArchiveStatus){
 const started=transferStartedAt(status);
 return (started?formatDateTime(started):'Saved transfer')+(status.manifest?' · '+status.manifest.rows.toLocaleString()+' rows · '+status.manifest.parts.toLocaleString()+' parts':'');
}
/** Everyday controls identify the transfer by its start and size; technical identity is for support. */
export function ArchiveTransferSummary({kind,id,status,busy,onId}:{kind:'Export'|'Restore';id:string;status?:ArchiveStatus;busy:boolean;onId:(id:string)=>void}){
 const [copied,setCopied]=useState(false),[error,setError]=useState('');
 async function copy(){
  try{await navigator.clipboard.writeText(JSON.stringify({transfer:kind,id,state:status?.state,startedAt:status?transferStartedAt(status):undefined,rows:status?.manifest?.rows,parts:status?.manifest?.parts},null,2));setCopied(true);setError('');}
  catch{setError('Open support details to select and copy the transfer ID.');}
 }
 return <section className="archive-transfer-summary" aria-label={kind+' transfer'}>
  {status&&<p><strong>{kind} started:</strong> {transferLabel(status)}</p>}
  {id&&<button type="button" aria-label={'Copy '+kind.toLowerCase()+' details'} onClick={()=>void copy()}>{copied?'Copied':'Copy details'}</button>}
  <details><summary>{kind} support details</summary><p>For support or resuming a transfer from another browser.</p><label>{kind} transfer ID<input value={id} onChange={event=>{setCopied(false);onId(event.target.value);}} disabled={busy} placeholder="Paste an ID supplied by support"/></label></details>
  {error&&<p role="status">{error}</p>}
 </section>;
}
