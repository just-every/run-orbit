import './meeting-writeback.css';
import {useEffect,useRef,useState} from 'react';
import {createId} from '../../../shared/ids';
import {recordsRequest} from './records-api';
import {workspaceInstant,workspaceLocalInput,workspaceTimeZone,zoneLabel} from './formatters';
import {OperatorState} from './operator-shell';
import {DataValue} from './data-value';
import {MeetingRecurrence} from './meeting-recurrence';
type Contact={id:string;name?:string|null;email?:string|null};
export function MeetingWriteback({kind,id,contacts,onChanged}:{kind:'contact'|'opportunity';id:string;contacts:Contact[];onChanged:()=>void}){
 const [sources,setSources]=useState<any[]>([]),[meetings,setMeetings]=useState<any[]>([]),[source,setSource]=useState(''),[calendar,setCalendar]=useState(''),[contact,setContact]=useState(contacts[0]?.id??''),[existing,setExisting]=useState(''),[operation,setOperation]=useState('create'),[title,setTitle]=useState(''),[message,setMessage]=useState(''),[start,setStart]=useState(''),[end,setEnd]=useState(''),[attendees,setAttendees]=useState(contacts[0]?.email??''),[review,setReview]=useState<any>(),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const [repeat,setRepeat]=useState({frequency:'',count:4,timeZone:workspaceTimeZone()}),[occurrence,setOccurrence]=useState('');
 const submitting=useRef(false),base='capture/writeback',selected=sources.find(s=>s.id===source),selectedMeeting=meetings.find(m=>m.id===existing);
 async function load(){const [options,records]=await Promise.all([recordsRequest<any>(base),recordsRequest<any>(`${base}/records/${kind}/${id}`)]);setSources(options.sources);setMeetings(records.meetings);}
 useEffect(()=>{void load().catch(e=>setError(e.message));},[kind,id]);
 function localOccurrence(value:string,zone:string){return new Intl.DateTimeFormat('en-US',{timeZone:zone,dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}
 function invalidate(){setReview(undefined);setNotice('');}
 function chooseMeeting(value:string){
  invalidate();setExisting(value);setOccurrence('');const row=meetings.find(m=>m.id===value);
  if(!row){setOperation('create');return;}
  const m=JSON.parse(row.payload_json);setSource(row.source_id);setCalendar(row.calendar_id);setContact(row.contact_id||contacts[0]?.id||'');setTitle(m.title);setMessage(m.message);setStart(workspaceLocalInput(m.start));setEnd(workspaceLocalInput(m.end));setAttendees(m.attendees.join('\n'));setOperation('reschedule');
 }
 async function preview(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError('');invalidate();
  try{
   const input={sourceId:source,calendarId:calendar,recordType:kind,recordId:id,contactId:contact,operation,...(existing?{writebackId:existing}:{}),...(occurrence?{occurrenceStart:occurrence}:{}),meeting:{title,message,start:workspaceInstant(start),end:workspaceInstant(end),attendees:attendees.split(/[\s,;]+/).filter(Boolean),...(!existing&&repeat.frequency?{recurrence:{frequency:repeat.frequency,count:repeat.count,timeZone:repeat.timeZone}}:{})}};
   setReview({...await recordsRequest<any>(`${base}/preview`,'POST',input),operationKey:createId()});
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 async function confirm(){
  if(submitting.current||!review)return;submitting.current=true;setBusy(true);setError('');const current=review;setReview(undefined);
  try{await recordsRequest(`${base}/confirm`,'POST',{input:current.input,reviewHash:current.reviewHash,operationKey:current.operationKey,confirmed:true});setNotice('Provider confirmed the calendar change.');await load();onChanged();}
  catch(e){setError((e as Error).message);await load().catch(()=>{});}finally{setBusy(false);submitting.current=false;}
 }
 return <section className="operator-surface workbench-form calendar-writeback" aria-labelledby={`meeting-writeback-${id}`}>
  <h2 id={`meeting-writeback-${id}`}>Calendar writeback</h2>
  {error&&<OperatorState kind="error">{error}</OperatorState>}{notice&&<OperatorState>{notice}</OperatorState>}
  <p>Invitations go only after you review exact attendees and message. <a href="/app/capture">Connect a calendar with separate writeback consent</a>.</p>
  {sources.filter(s=>!s.consented).map(s=><OperatorState key={s.id} kind="error">{s.name}: unresolved setup. {s.error??'Separate write consent is required.'} <a className="calendar-reconnect" href={`/app/capture/connect/${s.provider}?step=5&source=${encodeURIComponent(s.id)}`}>Reconnect calendar</a>. No invitation will be sent.</OperatorState>)}
  <details><summary>Plan calendar meeting</summary><form className="workbench-form" onSubmit={preview} onChange={invalidate}>
   <label>Meeting<select aria-label="Meeting" value={existing} onChange={e=>chooseMeeting(e.target.value)}><option value="">New meeting</option>{meetings.map(m=><option key={m.id} value={m.id} disabled={!['written','conflict'].includes(m.state)}>{JSON.parse(m.payload_json).title} · {m.captured?'captured · ':''}{m.state}</option>)}</select></label>
   {selectedMeeting?.error&&<OperatorState kind="error">{selectedMeeting.error}</OperatorState>}
   {!!selectedMeeting?.occurrences?.length&&<label>Exact occurrence<select aria-label="Exact occurrence" required value={occurrence} onChange={e=>{setOccurrence(e.target.value);const time=selectedMeeting.occurrences.find((o:any)=>o.start===e.target.value);if(time){setStart(workspaceLocalInput(time.start));setEnd(workspaceLocalInput(time.end));}}}><option value="">Choose one occurrence</option>{selectedMeeting.occurrences.map((o:any)=><option key={o.start} value={o.start}>{o.start} → {o.end}</option>)}</select></label>}
   <label>Calendar connection<select aria-label="Calendar connection" required value={source} onChange={e=>{setSource(e.target.value);setCalendar('');}}><option value="">Choose a consented connection</option>{sources.filter(s=>s.consented).map(s=><option key={s.id} value={s.id}>{s.name} · {s.provider}</option>)}</select></label>
   <label>Calendar<select aria-label="Calendar" required value={calendar} onChange={e=>setCalendar(e.target.value)}><option value="">Choose a selected calendar</option>{(selected?.calendars??[]).map((c:string)=><option key={c} value={c}>{c}</option>)}</select></label>
   <label>Customer<select aria-label="Customer" required value={contact} onChange={e=>setContact(e.target.value)}>{contacts.map(c=><option key={c.id} value={c.id}>{c.name??c.email}</option>)}</select></label>
   {existing&&<label>Change<select aria-label="Change" value={operation} onChange={e=>setOperation(e.target.value)}><option value="reschedule">Reschedule</option><option value="cancel">Cancel this occurrence</option></select></label>}
   <label>Meeting title<input required maxLength={200} value={title} onChange={e=>setTitle(e.target.value)}/></label>
   <label>Invitation message<textarea aria-label="Invitation message" required value={message} onChange={e=>setMessage(e.target.value)}/></label>
   <label>Exact attendee emails<textarea aria-label="Exact attendee emails" required value={attendees} onChange={e=>setAttendees(e.target.value)}/></label>
   <label>Start ({zoneLabel()})<input required type="datetime-local" value={start} onChange={e=>setStart(e.target.value)}/></label>
   <label>End ({zoneLabel()})<input required type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)}/></label>
   {!existing&&<MeetingRecurrence {...repeat} onChange={value=>{invalidate();setRepeat(value);}}/>}
   <button className="operator-button" disabled={busy||!source}>Review invitation</button>
  </form></details>
  {review&&<section aria-label="Invitation review"><h3>Review exact invitation</h3>
   {review.warning&&<OperatorState kind="error">{review.warning}</OperatorState>}
   <p>{review.input.operation} · {review.input.meeting.title}</p><p>{review.input.meeting.start} → {review.input.meeting.end}</p>
   {review.input.occurrenceStart&&<p>Only the occurrence originally at {review.input.occurrenceStart} changes. The rest of the series stays unchanged.</p>}
   {review.input.meeting.recurrence&&<><p>{review.input.meeting.recurrence.frequency} · {review.input.meeting.recurrence.timeZone} · ends after {review.occurrences.length} occurrences</p><ol aria-label="Exact occurrences">{review.occurrences.map((o:any)=><li key={o.start}>{localOccurrence(o.start,review.input.meeting.recurrence.timeZone)} → {localOccurrence(o.end,review.input.meeting.recurrence.timeZone)} · {o.start} → {o.end}</li>)}</ol></>}
   <p>Attendees: {review.input.meeting.attendees.join(', ')}</p><p style={{whiteSpace:'pre-wrap'}}>{review.input.meeting.message}</p>
   {review.providerEvent&&<details><summary>Current provider event</summary><DataValue value={review.providerEvent}/></details>}
   <div className="calendar-writeback-actions"><button type="button" disabled={busy} onClick={()=>void confirm()}>Confirm exact invitation once</button><button type="button" onClick={()=>setReview(undefined)}>Cancel review</button></div>
  </section>}
  <ul>{meetings.map(m=><li key={m.id}>{JSON.parse(m.payload_json).title} · {m.state}{m.error?' · '+m.error:''}</li>)}</ul>
 </section>;
}
