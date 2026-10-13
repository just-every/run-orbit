import {useCallback,useEffect,useState,type FormEvent} from 'react';
import {CaptureProposals} from './capture-proposals';
import './records.css';
import {OperatorShell,OperatorState} from './operator-shell';
import {useOperatorResource} from './use-operator-resource';

interface Summary {captured:number;unlinked:number;replayed:number;conflicts:number;attached:number;stopped:number;bounces:number;proposals:number;skipped:number;skipReasons:Record<string,number>}
interface Source {id:string;adapter:string;name:string;state:string;last_success_at:string|null;last_error:string|null;captured_count:number;skipped_count:number;proposals_waiting:number;has_credential:number;scope:{mail?:{folders:string[]};calendars?:string[]}}
const when=(value:string|null)=>value?new Date(value).toLocaleString():'Never';
const stateLabel=(source:Source)=>source.state==='disconnected'?'Disconnected':source.state==='error'?'Needs reconnecting':source.state==='syncing'?'Syncing':source.adapter!=='file'&&!source.has_credential?'Reconnect after restore':'Connected';

export function CapturePage(){
 const load=useCallback(async()=>{const response=await fetch('/api/v1/capture/sources',{credentials:'same-origin'});if(!response.ok)throw new Error('Capture sources could not load.');return await response.json() as {sources:Source[]};},[]);
 const sources=useOperatorResource('capture-sources',load),[summary,setSummary]=useState<Summary|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0);
 // A form posted before hydration returns here with its result in the address.
 useEffect(()=>{const params=new URLSearchParams(window.location.search),result=params.get('result'),failure=params.get('error');if(!result&&!failure)return;
  try{if(result)setSummary(JSON.parse(result) as Summary);}catch{setError('The import result could not be read.');}
  if(failure)setError(failure);window.history.replaceState(null,'','/app/capture');},[]);
 async function add(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const form=event.currentTarget;setBusy(true);setError('');setSummary(null);
  try{const response=await fetch('/api/v1/capture/imports',{method:'POST',credentials:'same-origin',body:new FormData(form)});const result=await response.json().catch(()=>({})) as {summary?:Summary;error?:string};
   if(!response.ok||!result.summary)throw new Error(result.error??'The files could not be captured.');setSummary(result.summary);form.reset();sources.reload();setRevision(value=>value+1);}
  catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 async function disconnect(source:Source){
  if(!window.confirm(`Disconnect ${source.name}? Intake stops now and its stored credential is deleted. Evidence already captured stays.`))return;
  setBusy(true);setError('');
  try{const response=await fetch(`/api/v1/capture/sources/${source.id}/disconnect`,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({confirmed:true})});if(!response.ok)throw new Error(((await response.json().catch(()=>({}))) as {error?:string}).error??'The source could not be disconnected.');sources.reload();}
  catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 const rows:[string,number][]=summary?[['Captured',summary.captured],['Attached to an Orbit thread',summary.attached],['Outreach stopped for a reply or booking',summary.stopped],['Delivery reports for Orbit sends',summary.bounces],['Proposed changes',summary.proposals],['Kept in the unlinked queue',summary.unlinked],['Already captured',summary.replayed],['Changed copies refused',summary.conflicts],['Not stored',summary.skipped]]:[];
 return <OperatorShell eyebrow="Customer evidence" title="Capture mail and calendar">
  <section className="operator-surface operator-detail__section" aria-labelledby="capture-add"><h2 id="capture-add">Add mail and calendar files</h2>
   <p>Orbit keeps only messages and events with a known contact or company domain. Captured evidence stops outreach to a person who replied or booked a meeting; every other change waits for your review. Nothing is sent.</p>
   <form className="workbench-form" method="post" action="/api/v1/capture/imports" encType="multipart/form-data" onSubmit={add}>
    <label>Mail (.eml or mbox) and calendar (.ics) files<input type="file" name="files" multiple required accept=".eml,.mbox,.ics,message/rfc822,application/mbox,text/calendar"/></label>
    <label className="capture-checkbox"><input type="checkbox" name="includeUnknown"/> Also keep messages with no known contact or company, for this import only. They wait in the unlinked queue.</label>
    <button className="orbit-button orbit-button--primary" disabled={busy}>{busy?'Adding…':'Add files'}</button>
   </form>
   {error&&<OperatorState kind="error">{error}</OperatorState>}
   {summary&&<div role="status"><h3>Import result</h3><div role="region" aria-label="Import result"><table className="capture-summary"><tbody>{rows.map(([name,count])=><tr key={name}><th scope="row">{name}</th><td>{count}</td></tr>)}</tbody></table></div>
    {summary.skipped>0&&<><h4>Why items were not stored</h4><ul>{Object.entries(summary.skipReasons).map(([reason,count])=><li key={reason}>{reason}: {count}</li>)}</ul></>}</div>}
  </section>
  <section className="operator-surface operator-detail__section" aria-labelledby="capture-sources"><h2 id="capture-sources">Sources</h2>
   {sources.loading&&<OperatorState>Loading sources…</OperatorState>}{sources.error&&<OperatorState kind="error">{sources.error.message}</OperatorState>}
   {sources.data&&!sources.data.sources.length&&<p>No mail or calendar has been captured yet.</p>}
   {sources.data?.sources.map(source=><article className="capture-source" key={source.id} aria-label={source.name}><h3>{source.name}</h3>
    <dl className="records-detail-list">{([['State',stateLabel(source)],['Reads',[...(source.scope.mail?.folders??[]),...(source.scope.calendars??[])].join(', ')||'Nothing declared'],['Last success',when(source.last_success_at)],['Last error',source.last_error??'None'],['Captured',String(source.captured_count)],['Not stored',String(source.skipped_count)],['Proposals waiting',String(source.proposals_waiting)]] as const).map(([name,value])=><div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
    {source.adapter!=='file'&&source.state!=='disconnected'&&<button className="orbit-button orbit-button--quiet" disabled={busy} onClick={()=>void disconnect(source)}>Disconnect {source.name}</button>}</article>)}
  </section>
  <CaptureProposals key={revision} onChanged={()=>sources.reload()}/>
 </OperatorShell>;
}
