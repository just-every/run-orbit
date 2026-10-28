import {useEffect,useState} from 'react';
import {Workflow,workflowRequest,workflowTime} from './workflows-types';

type UndoResult={runs:{runId:string;results:{undone?:boolean;skipped?:boolean;reason?:string}[]}[]};
type UndoReview=UndoResult&{version:number;from:string;to:string};

export function WorkflowsVersionUndo({workflow,onChanged}:{workflow:Workflow;onChanged:()=>Promise<unknown>}) {
 const [version,setVersion]=useState(String(workflow.version)),[from,setFrom]=useState(''),[to,setTo]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[review,setReview]=useState<UndoReview>();
 useEffect(()=>{setVersion(String(workflow.version));},[workflow.version]);

 async function undo() {
  const selectedVersion=Number(version),start=new Date(from),end=new Date(to);
  setError('');
  if(!Number.isInteger(selectedVersion)||selectedVersion<1||selectedVersion>workflow.version){setError('Choose an existing version number.');return;}
  if(!from||!to||!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())){setError('Choose both the start and end time.');return;}
  if(start>=end){setError('The end time must be after the start time.');return;}
  const range={version:selectedVersion,from:start.toISOString(),to:end.toISOString()};
  setBusy(true);setReview(undefined);
  try {
   const result=await workflowRequest<UndoResult>(`/${encodeURIComponent(workflow.id)}/undo`,range);
   setReview({...result,...range});
   try{await onChanged();}catch(caught){setError(`Undo finished, but execution history could not refresh: ${(caught as Error).message}`);}
  }catch(caught){setError((caught as Error).message);}
  finally{setBusy(false);}
 }

 return <details><summary>Undo a version</summary><div className="workflows-stack">
  <p className="workflows-note">Restore recorded field changes from one workflow version within a time range. A value is restored only if it still matches the workflow’s change, preserving later user edits. This sends nothing and does not delete tasks.</p>
  <form className="workflows-stack" onSubmit={event=>{event.preventDefault();void undo();}}>
   <label>Version number<input type="number" min="1" max={workflow.version} step="1" required disabled={busy} value={version} onChange={event=>setVersion(event.target.value)}/></label>
   <div className="workflows-grid"><label>From<input type="datetime-local" required disabled={busy} value={from} onChange={event=>setFrom(event.target.value)}/></label><label>To<input type="datetime-local" required disabled={busy} value={to} onChange={event=>setTo(event.target.value)}/></label></div>
   <p className="workflows-meta">Times use your browser’s time zone.</p>
   <div className="workflows-buttons"><button type="submit" disabled={busy}>{busy?'Inspecting and undoing…':'Inspect and undo version'}</button></div>
  </form>
  {error&&<p className="operator-state operator-state--error" role="alert">{error}</p>}
  {review&&<section className="workflows-stack" aria-label="Version undo results"><h3>Undo results · Version {review.version}</h3><p className="workflows-meta">{workflowTime(review.from)} to {workflowTime(review.to)}</p><p role="status">{review.runs.length?`Inspected ${review.runs.length} ${review.runs.length===1?'run':'runs'}.`:'No runs matched this version and time range.'}</p>{review.runs.map(run=><article className="workflows-card" key={run.runId}><h4>Run {run.runId}</h4>{!run.results.length?<p>No recorded field changes to undo.</p>:<ol>{run.results.map((result,index)=><li key={index}>{result.undone?'Restored the earlier value.':result.skipped?'Skipped this change.':'No value restored.'}{result.reason?` ${result.reason}`:''}</li>)}</ol>}</article>)}</section>}
 </div></details>;
}
