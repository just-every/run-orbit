import {useState} from 'react';
import './typed-field-history.css';
import {recordsRequest} from './records-api';
import {formatDateTime} from './formatters';
import {OperatorState} from './operator-shell';
import {plainFailure} from '../../dashboards/save-failure';
import {revisionChange,type FieldDefinition} from './typed-field-words';

type Revision={revision:number;changedAt:string;changedBy:string|null;definition:FieldDefinition;previous:FieldDefinition|null};
type History={revisions:Revision[];nextBeforeRevision:number|null};

export function TypedFieldHistory({kind,fieldKey,label}:{kind:string;fieldKey:string;label:string}){
 const [history,setHistory]=useState<History>(),[busy,setBusy]=useState(false),[failure,setFailure]=useState<{text:string;beforeRevision?:number}>();
 // Retry repeats the read that failed, so a failed "Earlier definitions" brings back the earlier page.
 async function load(beforeRevision?:number){
  setBusy(true);setFailure(undefined);
  try{
   const query=new URLSearchParams({kind,fieldKey,...(beforeRevision===undefined?{}:{beforeRevision:String(beforeRevision)})});
   const next=await recordsRequest<History>('settings/custom-fields/history?'+query);
   setHistory(previous=>({...next,revisions:beforeRevision===undefined?next.revisions:[...(previous?.revisions??[]),...next.revisions]}));
  }catch(e){setFailure({text:plainFailure(e),beforeRevision});}finally{setBusy(false);}
 }
 return <details className="typed-field-history" onToggle={event=>{if(event.currentTarget.open&&!history&&!busy&&!failure)void load();}}>
  <summary>{label} definition history</summary>
  {failure&&<OperatorState kind="error">{failure.text}<button type="button" disabled={busy} onClick={()=>void load(failure.beforeRevision)}>Retry history</button></OperatorState>}
  {history&&<ol>{history.revisions.map(item=><li key={item.revision}>
   {revisionChange(item.definition,item.previous)}<span className="typed-field-history__meta"> · {item.changedBy&&<>by {item.changedBy} · </>}<time dateTime={item.changedAt}>{formatDateTime(item.changedAt)}</time></span>
  </li>)}</ol>}
  {history?.revisions.length===0&&<p>No saved definition revisions are available.</p>}
  {busy&&<OperatorState>Loading definition history…</OperatorState>}
  {history?.nextBeforeRevision!==null&&history?.nextBeforeRevision!==undefined&&<button type="button" disabled={busy} onClick={()=>void load(history.nextBeforeRevision!)}>Earlier definitions</button>}
 </details>;
}
