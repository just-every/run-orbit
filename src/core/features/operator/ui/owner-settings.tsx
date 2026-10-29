import {useEffect,useState} from 'react';
import {recordsRequest} from './records-api';

export function OwnerSettings({owner,onSaved}:{owner:{email:string;editable:boolean}|null;onSaved:()=>Promise<void>}) {
 const [email,setEmail]=useState(owner?.email??''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 useEffect(()=>{setEmail(owner?.email??'');},[owner?.email]);
 if(!owner)return null;
 async function save(){if(!owner)return;setBusy(true);setError('');setSaved(false);try{await recordsRequest('settings/owner','PUT',{email,currentEmail:owner.email});await onSaved();setSaved(true);}catch(error){setError((error as Error).message);}finally{setBusy(false);}}
 return <section className="operator-surface settings-card" aria-labelledby="team-owner-email"><h2 id="team-owner-email">Owner email</h2><p className="settings-card__line">Used to recover the owner's sign-in; it travels with your records archive.</p>{owner.editable?<form className="settings-inline-form settings-inline-form--one" onSubmit={event=>{event.preventDefault();void save();}}><label>Owner email<input type="email" required maxLength={254} value={email} onChange={event=>{setEmail(event.target.value);setSaved(false);}}/></label><button className="operator-button" disabled={busy||email.trim().toLowerCase()===owner.email}>{busy?'Saving…':'Save owner email'}</button></form>:<p>{owner.email}. Only the installation owner can change it.</p>}{saved?<p role="status">Owner email saved. Sign-in links now go to this address.</p>:null}{error?<p role="alert">{error}</p>:null}</section>;
}
