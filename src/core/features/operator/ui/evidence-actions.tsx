import {label,workspaceInstant,zoneLabel} from './formatters';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import type { OpportunityDetail } from './operator-api';
import { workbenchRequest } from './workbench-api';
import { OperatorState } from './operator-shell';
const events=['form.submitted','email.replied','meeting.booked','meeting.completed','email.bounced','email.unsubscribed','content.downloaded','page.viewed'];
export function EvidenceActions({ opportunity, reload, mode }: {opportunity:OpportunityDetail;reload:()=>void;mode:'draft'|'activity'}) {
  const navigate=useNavigate(),[error,setError]=useState<string|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  async function record(event:FormEvent<HTMLFormElement>) {event.preventDefault();const form=event.currentTarget, data=new FormData(form);setBusy(true);setError(null);try {await workbenchRequest(`/opportunities/${opportunity.id}/events`,{type:data.get('type'),subject:data.get('subject'),occurredAt:workspaceInstant(String(data.get('occurredAt'))),eventId:crypto.randomUUID(),contactId:String(data.get('contactId')),permanentBounce:data.get('permanentBounce')==='on'});setMessage('Customer event recorded with your operator attribution.');form.reset();reload();}catch(error){setError((error as Error).message);}finally{setBusy(false);}}
  async function draft(event:FormEvent<HTMLFormElement>) {event.preventDefault();const data=new FormData(event.currentTarget);setBusy(true);setError(null);try{const {id}=await workbenchRequest<{id:string}>(`/opportunities/${opportunity.id}/drafts`,Object.fromEntries(data));await navigate({to:'/app/drafts/$id',params:{id}});}catch(error){setError((error as Error).message);}finally{setBusy(false);}}
  const recipients=opportunity.contacts.filter(contact=>contact.email&&contact.contactability==='contactable');
  if(mode==='draft'&&!recipients.length){
    const held=opportunity.contacts.filter(contact=>contact.email&&contact.contactability!=='contactable');
    return <section className="operator-surface workbench-form">
      <h2>Write follow-up</h2>
      {held.length?<><p>The contacts on this deal with an email address are marked Do not contact. Review their email permission before writing a follow-up.</p>
        <ul>{held.map(contact=><li key={contact.id}><Link to="/app/contacts/$id" params={{id:contact.id}}>Review email permission for {contact.name??contact.email}</Link></li>)}</ul></>
        :<p>Add a contact with an email address and permission to receive mail to this deal before writing a follow-up.</p>}
    </section>;
  }
  return <div className="workbench-evidence">
    {mode==='activity'&&<details className="r-fold"><summary>Log verified customer activity</summary><form className="operator-surface workbench-form" onSubmit={record}><p>Attest an event you verified. This records your identity as its source; personal notes are not scoring evidence.</p><div className="workbench-form-row"><label>Event type<select name="type">{events.map(type=><option key={type} value={type}>{label(type)}</option>)}</select></label><label>Occurred time ({zoneLabel()})<input name="occurredAt" type="datetime-local" required/></label></div><label>Event contact<select name="contactId" required>{opportunity.contacts.map(contact=><option key={contact.id} value={contact.id}>{contact.name} · {contact.email}</option>)}</select></label><label><input name="permanentBounce" type="checkbox"/>This email bounce is permanent</label><label>Evidence subject<input name="subject" required maxLength={2000}/></label><button className="operator-button" disabled={busy}>Record event</button>{message?<OperatorState>{message}</OperatorState>:null}</form></details>}
    {mode==='draft'&&<form className="operator-surface workbench-form" onSubmit={draft}><h2>Write follow-up</h2><p>Write a message to review before sending. Saving this draft sends nothing.</p><label>Recipient<select name="contactId" required>{recipients.map(c=><option value={c.id} key={c.id}>{c.name} · {c.email}</option>)}</select></label><label>Subject<input name="subject" required maxLength={998}/></label><label>Email body<textarea name="body" required rows={8}/></label><button className="operator-button" disabled={busy}>Save draft for review</button></form>}
    {error?<OperatorState kind="error">{error}</OperatorState>:null}
  </div>;
}
