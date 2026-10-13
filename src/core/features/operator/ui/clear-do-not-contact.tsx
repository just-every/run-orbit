import {useOperatorDialog} from './operator-dialog';
import { useState } from 'react';
import { recordsRequest, type CustomerRecord } from './records-api';

export function ClearDoNotContact({record,onCleared}:{record:CustomerRecord;onCleared:()=>void}) {
 const {ask,dialog}=useOperatorDialog();
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 return <div><button type="button" disabled={busy} onClick={async()=>{
  if(await ask({title:'Clear do-not-contact',description:`Clear do-not-contact for ${record.email??record.name??'this contact'}? Future messages will require a new operator review. Cancelled messages stay cancelled.`,confirmLabel:'Clear do-not-contact'})===null)return;
  setBusy(true);setError('');
  try{await recordsRequest(`records/contact/${record.id}/clear-do-not-contact`,'POST',{confirmed:true,email:record.email??null,updatedAt:record.updated_at,revision:record.contactability_revision});onCleared();}
  catch(error){setError((error as Error).message);}finally{setBusy(false);}
 }}>Clear do-not-contact</button>{dialog}{error?<span role="alert">{error}</span>:null}</div>;
}
