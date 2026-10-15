import {useEffect,useState} from 'react';
import {recordsRequest} from './records-api';

export function OwnerSettings({owner,onSaved}:{owner:{email:string;editable:boolean}|null;onSaved:()=>Promise<void>}) {
 const [email,setEmail]=useState(owner?.email??''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 useEffect(()=>{setEmail(owner?.email??'');},[owner?.email]);
 if(!owner)return null;
 async function save(){if(!owner)return;setBusy(true);setError('');setSaved(false);try{await recordsRequest('settings/owner','PUT',{email,currentEmail:owner.email});await onSaved();setSaved(true);}catch(error){setError((error as Error).message);}finally{setBusy(false);}}
 return <section className="operator-surface workbench-form"><h2>Installation owner</h2><p>Owner email: <strong>{owner.email}</strong>. This address travels with your records archive.</p>{owner.editable?<form className="workbench-form" onSubmit={event=>{event.preventDefault();void save();}}><p>Use your real mailbox before moving a local workspace to a hosted installation. You stay signed in here; other owner sessions and old email links are revoked. Hosted changes require a fresh sign-in confirmation.</p><label>Owner email<input type="email" required maxLength={254} value={email} onChange={event=>{setEmail(event.target.value);setSaved(false);}}/></label><button className="operator-button" disabled={busy||email.trim().toLowerCase()===owner.email}>{busy?'Saving…':'Save owner email'}</button></form>:<p>Only the installation owner can change this email.</p>}{saved?<p role="status">Owner email saved. Future sign-in links use this address. Local dev sign-in continues to work; local mail is suppressed.</p>:null}{error?<p role="alert">{error}</p>:null}</section>;
}
