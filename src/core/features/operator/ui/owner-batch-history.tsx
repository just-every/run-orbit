import {useEffect,useState} from 'react';
import {recordsRequest,type RecordKind} from './records-api';
import type {OwnerBatch,OwnerResult} from './record-ownership-api';
import {formatDate} from './formatters';

export function OwnerBatchHistory({kind,generation,onChanged}:{kind:RecordKind;generation:number;onChanged:()=>Promise<void>}){
 const [open,setOpen]=useState(false),[items,setItems]=useState<OwnerBatch[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(''),[message,setMessage]=useState('');
 async function load(){const data=await recordsRequest<{items:OwnerBatch[]}>('records/owners/batches');setItems(data.items.filter(item=>item.kind===kind));}
 useEffect(()=>{if(open)void load().catch(e=>setError(e.message));},[open,kind,generation]);
 async function undo(id:string){setBusy(id);setError('');try{const result=await recordsRequest<OwnerResult>(`records/owners/batches/${id}/undo`,'POST');setMessage(`${result.changed.length} record(s) restored. ${result.failures.length} could not be restored.${result.failures.map(item=>` ${item.name??item.id}: ${item.reason}`).join('')}`);await load();await onChanged();}catch(e){setError((e as Error).message);}finally{setBusy('');}}
 return <details className="owner-batch-history" open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary>Owner assignment history and undo</summary>{items.length?<ul>{items.map(item=><li key={item.batchId}><span>{formatDate(item.createdAt)} · {item.newOwnerName??'Unassigned'} · {item.changedCount} changed, {item.undoneCount} restored</span>{item.canUndo&&<button disabled={Boolean(busy)} onClick={()=>void undo(item.batchId)}>{busy===item.batchId?'Restoring…':'Undo owner assignment'}</button>}</li>)}</ul>:<p>No owner assignment batches for this record type.</p>}{message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}</details>;
}
