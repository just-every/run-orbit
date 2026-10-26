import {useState} from 'react';
import './typed-field-history.css';
import {recordsRequest} from './records-api';
import {OperatorState} from './operator-shell';

type Revision={revision:number;changedAt:string;definition:{label:string;valueType:string;required:number;unique:number;options:string[];archived:number}};
type History={revisions:Revision[];nextBeforeRevision:number|null};

export function TypedFieldHistory({kind,fieldKey,label}:{kind:string;fieldKey:string;label:string}){
 const [history,setHistory]=useState<History>(),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function load(beforeRevision?:number){
  setBusy(true);setError('');
  try{
   const query=new URLSearchParams({kind,fieldKey,...(beforeRevision===undefined?{}:{beforeRevision:String(beforeRevision)})});
   const next=await recordsRequest<History>('settings/custom-fields/history?'+query);
   setHistory(previous=>({...next,revisions:beforeRevision===undefined?next.revisions:[...(previous?.revisions??[]),...next.revisions]}));
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <details className="typed-field-history" onToggle={event=>{if(event.currentTarget.open&&!history&&!busy&&!error)void load();}}>
  <summary>{label} definition history</summary>
  <p>Saved definitions preserve the field’s name, type and choices. Record value changes are separate from this history.</p>
  {error&&<OperatorState kind="error">{error}<button type="button" disabled={busy} onClick={()=>void load()}>Retry history</button></OperatorState>}
  {history&&<ol>{history.revisions.map(item=><li key={item.revision}>
   <h3>Revision {item.revision}: {item.definition.label}</h3>
   <p><time dateTime={item.changedAt}>{item.changedAt}</time> · {item.definition.valueType} · {item.definition.required?'Required':'Optional'} · {item.definition.unique?'Unique':'Duplicates allowed'} · {item.definition.archived?'Archived':'Active'}</p>
   {item.definition.options.length>0&&<p>Choices: {item.definition.options.join(', ')}</p>}
  </li>)}</ol>}
  {history?.revisions.length===0&&<p>No saved definition revisions are available.</p>}
  {busy&&<OperatorState>Loading definition history…</OperatorState>}
  {history?.nextBeforeRevision!==null&&history?.nextBeforeRevision!==undefined&&<button type="button" disabled={busy} onClick={()=>void load(history.nextBeforeRevision!)}>Earlier definitions</button>}
 </details>;
}
