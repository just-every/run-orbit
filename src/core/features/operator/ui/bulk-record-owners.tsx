import {useEffect,useState} from 'react';
import {recordsRequest,type RecordKind} from './records-api';
import {OwnerOptions,type OwnerResult,type OwnerReview,type RecordOperator} from './record-ownership-api';
import {OwnerBatchHistory} from './owner-batch-history';
import {formatTime} from './formatters';

export function BulkRecordOwners({kind,ids,operators,onChanged}:{kind:RecordKind;ids:string[];operators:RecordOperator[];onChanged:()=>Promise<void>}){
 const [owner,setOwner]=useState(''),[review,setReview]=useState<OwnerReview>(),[result,setResult]=useState<OwnerResult>(),[busy,setBusy]=useState(false),[error,setError]=useState(''),[generation,setGeneration]=useState(0);
 const selection=ids.join(',');
 useEffect(()=>{setReview(undefined);setResult(undefined);setError('');},[kind,selection]);
 async function preview(){setBusy(true);setError('');setResult(undefined);try{setReview(await recordsRequest<OwnerReview>('records/owners/preview','POST',{kind,ids,ownerId:owner||null}));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function apply(){if(!review)return;setBusy(true);setError('');try{const next=await recordsRequest<OwnerResult>(`records/owners/reviews/${review.id}/apply`,'POST');setResult(next);setReview(undefined);setGeneration(value=>value+1);await onChanged();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section className={`operator-surface workbench-form bulk-record-owners${ids.length?'':' bulk-record-owners--idle'}`} aria-label="Bulk owner assignment"><h2>Assign record owners</h2><p>{ids.length?`${ids.length} selected. Review the previous owner of each record before applying.`:'Select records from the list to assign an owner together.'}</p>{ids.length>0&&<div className="record-owner__controls"><label>New owner<select value={owner} disabled={busy} onChange={e=>{setOwner(e.target.value);setReview(undefined);setResult(undefined);}}><option value="">Unassigned</option><OwnerOptions operators={operators}/></select></label><button disabled={busy||!ids.length} onClick={()=>void preview()}>{busy?'Working…':'Review owner changes'}</button></div>}
  {review&&<section className="owner-review" aria-label="Owner change review"><h3>Review assignment to {review.ownerName??'Unassigned'}</h3><ul>{review.items.map(item=><li key={item.id}><strong>{item.name}</strong><span>{item.previousOwnerName??'Unassigned'} → {review.ownerName??'Unassigned'}</span>{item.status==='unavailable'&&<span role="status">Cannot change: {item.reason??'Record unavailable'}</span>}</li>)}</ul><p>The review expires at <time dateTime={review.expiresAt}>{formatTime(review.expiresAt)}</time>. Changed or unavailable records will be reported separately.</p><div className="workbench-actions"><button disabled={busy} onClick={()=>setReview(undefined)}>Cancel review</button><button className="operator-button" disabled={busy||!review.items.some(item=>item.status==='ready')} onClick={()=>void apply()}>Apply reviewed owner changes</button></div></section>}
  {result&&<OwnerChangeResult result={result}/>}{error&&<p role="alert">{error}</p>}
  <OwnerBatchHistory kind={kind} generation={generation} onChanged={async()=>{setResult(undefined);await onChanged();}}/>
 </section>;
}

export function OwnerChangeResult({result}:{result:Pick<OwnerResult,'changed'|'failures'|'replayed'>}){
 return <div className="owner-change-result" role="status"><p>{result.changed.length} record(s) changed.{result.replayed?' This batch was already applied.':''}</p>{result.failures.length>0&&<><p>{result.failures.length} record(s) were not changed:</p><ul>{result.failures.map(item=><li key={item.id}>{item.name??item.id}: {item.reason}</li>)}</ul></>}</div>;
}
