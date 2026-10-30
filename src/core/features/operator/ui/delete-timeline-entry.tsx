import {useRef,useState} from 'react';
import {InlineConfirm} from './autosave/inline-confirm';
import {recordsRequest,type RecordKind} from './records-api';

/** Delete for a manual entry: asks once in place (Escape or Keep it returns to the button), never in a dialog. */
export function DeleteTimelineEntry({kind,recordId,entryId,onDeleted}:{kind:RecordKind;recordId:string;entryId:string;onDeleted:()=>void}){
 const[asking,setAsking]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),trigger=useRef<HTMLButtonElement>(null);
 async function remove(){
  setBusy(true);setError('');
  try{await recordsRequest(`records/${kind}/${recordId}/entries/${entryId}`,'DELETE');setAsking(false);onDeleted();}
  catch(reason){setError((reason as Error).message);}finally{setBusy(false);}
 }
 return <>{asking?<InlineConfirm busy={busy} error={error} sentence="Delete this entry from every record it is on?" action="Delete entry" keep="Keep it" onConfirm={()=>void remove()} onKeep={()=>{setAsking(false);setError('');requestAnimationFrame(()=>trigger.current?.focus());}}/>:<button ref={trigger} type="button" className="operator-text-button" onClick={()=>setAsking(true)}>Delete entry</button>}</>;
}
