import {useState} from 'react';
import {recordsRequest,type RecordKind} from './records-api';
import {useOperatorDialog} from './operator-dialog';

export function DeleteTimelineEntry({kind,recordId,entryId,onDeleted}:{kind:RecordKind;recordId:string;entryId:string;onDeleted:()=>void}){
 const[busy,setBusy]=useState(false),[error,setError]=useState('');
 const{ask,dialog}=useOperatorDialog();
 async function remove(){
  if(await ask({title:'Delete timeline entry',description:'Permanently remove this manual entry from its linked records?',confirmLabel:'Delete entry'})===null)return;
  setBusy(true);setError('');
  try{await recordsRequest(`records/${kind}/${recordId}/entries/${entryId}`,'DELETE');onDeleted();}
  catch(reason){setError((reason as Error).message);}finally{setBusy(false);}
 }
 return <><button type="button" disabled={busy} onClick={()=>void remove()}>Delete entry</button>{dialog}{error&&<p role="alert">{error}</p>}</>;
}
