import {useEffect,useState,type FormEvent} from 'react';
import {recordsRequest} from './records-api';
import {OperatorState} from './operator-shell';
import {formatDateTime} from './formatters';
interface Status {state:'connected'|'unresolved-setup';reason:string|null;held:boolean;owner:boolean;ownership:string;webhookPath:string}
interface Preview {digest:string;deal:{id:string;title:string};meeting:{id:string;topic:string;start:string;duration:number;hostId:string;joinUrl:string;recording:string};participants:{email:string;state:string}[]}
/** Settings-only setup and explicit review; neither connecting nor attaching sends an invitation. */
export function ZoomSettings(){
 const [status,setStatus]=useState<Status>(),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[meetingId,setMeetingId]=useState(''),[dealId,setDealId]=useState(''),[query,setQuery]=useState(''),[deals,setDeals]=useState<{id:string;title:string}[]>([]),[preview,setPreview]=useState<Preview>(),[attached,setAttached]=useState<string>();
 const load=async()=>setStatus(await recordsRequest<Status>('settings/zoom'));
 useEffect(()=>{void load().catch(error=>setError((error as Error).message));},[]);
 async function run(action:()=>Promise<void>){setBusy(true);setError('');setNotice('');try{await action();}catch(error){setError((error as Error).message);await load().catch(()=>undefined);}finally{setBusy(false);}}
 async function connect(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget,data=new FormData(form),credentials=Object.fromEntries(['accountId','clientId','clientSecret','webhookSecret'].map(key=>[key,String(data.get(key))]));form.reset();await run(async()=>{await recordsRequest('settings/zoom/connect','POST',credentials);await load();setNotice('Zoom accepted the connection.');window.dispatchEvent(new Event('orbit-products-changed'));});}
 return <section className="workbench-form integration-setup" aria-labelledby="zoom-settings"><h2 id="zoom-settings">Zoom meetings</h2>
  <p>{status?.ownership??'Zoom runs the meeting. Orbit keeps reviewed deal activities, preparation and follow-up.'}</p>
  {error&&<OperatorState kind="error">{error}</OperatorState>}{notice&&<OperatorState>{notice}</OperatorState>}
  {!status?<OperatorState>Loading Zoom…</OperatorState>:<>
   <OperatorState>{status.state==='connected'?'Zoom connected':`Unresolved setup. ${status.reason}`}</OperatorState>
   {status.owner?<><form className="workbench-form" onSubmit={event=>void connect(event)}><h3>{status.held?'Replace Zoom credentials':'Connect Zoom'}</h3>
    <p>Use your Zoom Server-to-Server OAuth app. Orbit checks it with Zoom before saving credentials in this installation’s sealed storage. They are never shown again or exported. After a restore, connect again.</p>
    <label>Zoom account ID<input name="accountId" type="password" autoComplete="new-password" required maxLength={200}/></label>
    <label>Zoom client ID<input name="clientId" type="password" autoComplete="new-password" required maxLength={200}/></label>
    <label>Zoom client secret<input name="clientSecret" type="password" autoComplete="new-password" required maxLength={300}/></label>
    <label>Zoom webhook secret token<input name="webhookSecret" type="password" autoComplete="new-password" required maxLength={300}/></label>
    <button className="operator-button" disabled={busy}>Check and connect Zoom</button></form>
    <p>Subscribe the Zoom app to meeting.ended and meeting.deleted. Set its Event notification endpoint URL to <code style={{overflowWrap:'anywhere'}}>{typeof window==='undefined'?'':window.location.origin}{status.webhookPath}</code>. Grant read access to scheduled meetings and past meeting participants. Zoom validates the endpoint using your secret token.</p>
    {status.held&&<button type="button" disabled={busy} onClick={()=>void run(async()=>{await recordsRequest('settings/zoom/disconnect','POST',{});setPreview(undefined);await load();setNotice('Zoom disconnected. Credentials deleted; activities remain.');window.dispatchEvent(new Event('orbit-products-changed'));})}>Disconnect Zoom</button>}
   </>:<p>Ask the installation owner to connect or change Zoom credentials.</p>}
   <p>Recording and transcript content is never fetched. A missing transcript or ungranted recording permission stays visible on the meeting plan.</p>
   {status.state==='connected'&&<><h3>Attach a meeting to a deal</h3><p>Choose the exact scheduled, non-recurring Zoom meeting ID and the deal. Review the details before attaching. Orbit creates no meeting and sends no invitation.</p>
    <form className="workbench-form" onSubmit={event=>{event.preventDefault();void run(async()=>{const result=await recordsRequest<{records:{id:string;title:string}[]}>('records/opportunity?q='+encodeURIComponent(query));setDeals(result.records);setDealId('');setPreview(undefined);});}}><label>Find a deal<input value={query} onChange={event=>setQuery(event.target.value)} maxLength={500}/></label><button type="submit" disabled={busy}>Find deals</button></form>
    <form className="workbench-form" onSubmit={event=>{event.preventDefault();void run(async()=>{setAttached(undefined);setPreview(await recordsRequest<Preview>('zoom/meetings/preview','POST',{meetingId,opportunityId:dealId}));});}}>
     <label>Deal<select aria-label="Deal" required value={dealId} onChange={event=>{setDealId(event.target.value);setPreview(undefined);}}><option value="">Choose the exact deal</option>{deals.map(deal=><option key={deal.id} value={deal.id}>{deal.title}</option>)}</select></label>
     <label>Exact Zoom meeting ID<input required inputMode="numeric" pattern="[0-9]{9,11}" value={meetingId} onChange={event=>{setMeetingId(event.target.value);setPreview(undefined);}}/></label><button type="submit" disabled={busy||!dealId}>Read meeting for review</button>
    </form>
    {preview&&<div className="workbench-form" role="region" aria-label="Review Zoom attachment"><h3>Review exact attachment</h3><p><strong>{preview.meeting.topic}</strong> → {preview.deal.title}</p><p>Meeting ID {preview.meeting.id} · {formatDateTime(preview.meeting.start)} · {preview.meeting.duration} minutes · Host {preview.meeting.hostId}</p><p><a href={preview.meeting.joinUrl} target="_blank" rel="noreferrer">Open the exact Zoom meeting</a></p>
     <ul>{preview.participants.map(person=><li key={person.email}>{person.email} · {person.state==='matched'?'Exact contact match':person.state==='ambiguous'?'Ambiguous; unresolved':person.state==='operator'?'Internal operator':'No exact contact; unresolved'}</li>)}</ul>
     <p>{preview.meeting.recording==='disabled'?'Recording disabled in Zoom.':preview.meeting.recording==='permission-not-granted'?'Recording permission not granted.':'Recording permission held, unused by Orbit.'} Transcript missing; no recording or transcript content is fetched. Attaching changes no outreach state.</p>
     <button type="button" className="operator-button" disabled={busy} onClick={()=>void run(async()=>{const result=await recordsRequest<{planHref:string}>('zoom/meetings/attach','POST',{meetingId:preview.meeting.id,opportunityId:preview.deal.id,previewDigest:preview.digest,confirmed:true});setPreview(undefined);setAttached(result.planHref);})}>Confirm this meeting and deal</button><button type="button" disabled={busy} onClick={()=>setPreview(undefined)}>Cancel attachment</button>
    </div>}
    {attached&&<p role="status">Meeting attached. <a href={attached}>Open meeting preparation</a></p>}
   </>}
  </>}
 </section>;
}
