import {useState} from 'react';
import {CapturedMailLinks} from '../capture-deal-links';
import {MeetingWriteback} from '../meeting-writeback';
import {mailEntries,type MailHistory} from '../record-mail';
import type {CustomerRecord} from '../records-api';
import {UnlinkedReplies} from '../unlinked-replies';
import {Activity,type ActivityEntry} from './activity';
import {CallPanel,MeetingPanel,NotePanel} from './activity-panels';
import {timelineEntry} from './timeline-entries';

/** A record read's timeline row (payload as JSON text). */
export interface TimelineRow{id:string;kind:string;occurred_at:string;recorded_at:string;actor_type:string;actor_name:string|null;source:string;source_name:string|null;signal_type:string|null;payload_json:string}

/** A company plans a meeting with one of its people. */
function CompanyMeeting({contacts,onChanged}:{contacts:CustomerRecord[];onChanged:()=>void}){
 const [person,setPerson]=useState(contacts[0]?.id??''),chosen=contacts.find(contact=>contact.id===person);
 if(!contacts.length)return <p className="r-note">Add a person to this company to plan a meeting with them.</p>;
 return <>{contacts.length>1?<label className="r-field">With<select value={person} onChange={event=>setPerson(event.target.value)}>{contacts.map(contact=><option key={contact.id} value={contact.id}>{contact.name??contact.email}</option>)}</select></label>:null}{chosen?<MeetingWriteback key={chosen.id} kind="contact" id={chosen.id} contacts={[chosen]} onChanged={onChanged}/>:null}</>;
}

/** A contact's or a company's activity: its timeline (manual entries editable in place), and a contact's mail and the
 * replies that still need a thread, with Log a call, Plan a meeting and Add a note. */
export function RecordActivity({kind,id,record,timeline,contacts,mail,reloadMail,reload}:{kind:'contact'|'company';id:string;record:CustomerRecord;timeline:TimelineRow[];contacts:CustomerRecord[];mail?:MailHistory;reloadMail:()=>Promise<void>;reload:()=>void}){
 const names=new Map(contacts.map(contact=>[contact.id,contact.name??contact.email??'A contact']));
 const entries:ActivityEntry[]=[
  ...timeline.map((row):ActivityEntry|null=>{
   const payload=JSON.parse(row.payload_json??'{}') as Record<string,unknown>;
   const entry=timelineEntry({line:{id:row.id,kind:row.kind,occurredAt:row.occurred_at,recordedAt:row.recorded_at,actorType:row.actor_type,actorName:row.actor_name,sourceName:row.source_name??row.source,signalType:row.signal_type,payload},kind,recordId:id,contactNames:names,reload,onChanged:reload});
   return entry?{...entry,tools:<>{entry.tools}<CapturedMailLinks payload={payload} onChanged={reload}/></>}:null;
  }).filter((entry):entry is ActivityEntry=>Boolean(entry)),
  ...mailEntries(mail,reloadMail),
 ];
 const people=kind==='contact'?[record]:contacts;
 return <div className="r-activity-box" id={kind==='contact'?'record-mail':undefined}>
  <Activity entries={entries} actions={[
   {label:'Log a call',panel:<CallPanel kind={kind} id={id} contacts={people} onSaved={reload}/>},
   {label:'Plan a meeting',panel:kind==='contact'?<MeetingPanel kind="contact" id={id} contacts={[record]} onChanged={reload}/>:<CompanyMeeting contacts={contacts} onChanged={reload}/>},
   {label:'Add a note',panel:<NotePanel kind={kind} id={id} contacts={people} reload={reload}/>},
  ]}/>
  {kind==='contact'?<UnlinkedReplies contactId={id} onResolved={()=>{void reloadMail();reload();}}/>:null}
 </div>;
}
