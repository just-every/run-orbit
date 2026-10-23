import {useState} from 'react';
import {recordsRequest} from './records-api';
import {OperatorState} from './operator-shell';
import {ReviewedRecordChanges,type ReviewedRecordChange} from './reviewed-record-changes';
import './record-owner.css';

interface OwnerBatch {id:string;items:ReviewedRecordChange[]}
interface OwnerOperator {id:string;display_name:string;status:string}
export function RecordOwner({kind,ids,operators,currentOwner,onChanged}:{kind:'contact'|'company';ids:string[];operators:OwnerOperator[];currentOwner?:string|null;onChanged:()=>Promise<void>}) {
 const [ownerId,setOwnerId]=useState(''),[batch,setBatch]=useState<OwnerBatch>(),[phase,setPhase]=useState<'choose'|'review'|'applied'|'undone'>('choose'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function perform(action:'review'|'apply'|'undo') {
  setBusy(true);setError('');
  try {
   const result=await recordsRequest<OwnerBatch>(action==='review'?'records/ownership/review':`records/ownership/${batch!.id}/${action}`,'POST',action==='review'?{kind,ids,ownerId:ownerId||null}:{});
   setBatch(result);setPhase(action==='review'?'review':action==='apply'?'applied':'undone');
   if(action!=='review')await onChanged();
  } catch(e) {setError((e as Error).message);} finally {setBusy(false);}
 }
 return <section className="operator-surface workbench-form record-owner" aria-label="Record ownership">
  <h2>{ids.length===1?'Record owner':`Assign ${ids.length} selected records`}</h2>
  {currentOwner!==undefined?<p>Current owner: {currentOwner??'Unassigned'}</p>:null}
  {phase==='choose'?<form onSubmit={e=>{e.preventDefault();void perform('review');}}>
   <label>New owner<select value={ownerId} onChange={e=>setOwnerId(e.target.value)}><option value="">Unassigned</option>{operators.filter(user=>user.status==='active').map(user=><option key={user.id} value={user.id}>{user.display_name}</option>)}</select></label>
   <button disabled={busy||!ids.length}>{busy?'Preparing review…':'Review assignment'}</button>
  </form>:<>
   <p>{phase==='review'?'Review every change before applying. A record changed since this review is refused.':phase==='applied'?'Assignment finished. Individual results are listed below. Undo restores only records that have not changed since.':'Undo finished. Individual results are listed below.'}</p>
   {batch?<ReviewedRecordChanges items={batch.items}/>:null}
   <div className="workbench-actions">
    {phase==='review'?<><button disabled={busy} onClick={()=>{setBatch(undefined);setPhase('choose');}}>Cancel review</button><button className="operator-button" disabled={busy} onClick={()=>void perform('apply')}>{busy?'Applying…':'Apply assignment'}</button></>:phase==='applied'?<button disabled={busy} onClick={()=>void perform('undo')}>{busy?'Undoing…':'Undo assignment'}</button>:null}
    {phase!=='review'?<button disabled={busy} onClick={()=>{setBatch(undefined);setPhase('choose');}}>Review another assignment</button>:null}
   </div>
  </>}
  {error?<OperatorState kind="error">{error}</OperatorState>:null}
 </section>;
}
