import {useState} from 'react';
import {recordsRequest,type RecordKind} from './records-api';
import {useOperatorDialog} from './operator-dialog';

export function DeleteRecord({kind,id,onDeleted}:{kind:RecordKind;id:string;onDeleted:()=>Promise<void>}){
 const {ask,dialog}=useOperatorDialog(),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function remove(){
  const description=kind==='contact'?'Delete this contact and permanently erase their personal history? This also clears notifications and AI error details for their linked opportunities, including shared opportunities. AI usage totals remain.':`Delete this ${kind}?`;
  if(await ask({title:'Delete record',description,confirmLabel:'Delete record'})===null)return;
  setBusy(true);setError('');
  try{await recordsRequest(`records/${kind}/${id}`,'DELETE',{confirmed:true});await onDeleted();}
  catch(reason){setError((reason as Error).message);}finally{setBusy(false);}
 }
 return <div><button disabled={busy} onClick={()=>void remove()}>Delete record</button>{dialog}{error&&<p role="alert">{error}</p>}</div>;
}

export function RecordLifecycle({id,onChanged}:{id:string;onChanged:()=>Promise<void>}){
 const {ask,dialog}=useOperatorDialog(),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function change(state:'open'|'won'|'lost'){
  const reason=state==='open'?'':await ask({title:`Close ${state}`,description:'Record why this opportunity is closing. Its evidence and outreach history remain available.',confirmLabel:`Close ${state}`,field:{label:'Reason for closing this opportunity',required:true,maxLength:2000}});
  if(reason===null)return;
  setBusy(true);setError('');
  try{await recordsRequest(`records/opportunity/${id}/lifecycle`,'POST',{state,reason});await onChanged();}
  catch(reason){setError((reason as Error).message);}finally{setBusy(false);}
 }
 return <section><h3>Lifecycle</h3><div className="operator-record-actions">{(['open','won','lost'] as const).map(state=><button key={state} disabled={busy} onClick={()=>void change(state)}>{state==='open'?'Reopen':`Close ${state}`}</button>)}</div>{dialog}{error&&<p role="alert">{error}</p>}</section>;
}
