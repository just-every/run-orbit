import {RecordDetailFields} from './record-detail-fields';
import {EntryPrivacy} from './entry-privacy';
import {MeetingWriteback} from './meeting-writeback';
import {ReviewedCall} from './reviewed-call';
import {CapturedMailLinks} from './capture-deal-links';
import {RecordMail} from './record-mail';
import {RecordOwner} from './record-owner';
import {BuyingContext} from './buying-context';
import {RecordEntryDetails} from './record-entry-details';
import {mailEvidenceTitle,MailEvidenceNote} from './mail-evidence';
import {DeleteTimelineEntry} from './delete-timeline-entry';
import {ScrollToHash} from './hash-target';
import {formatCurrency,formatDateTime,label} from './formatters';
import {DeleteRecord} from './record-actions';
import {ClearDoNotContact} from './clear-do-not-contact';
import {CaptureProposals} from './capture-proposals';
import {WorkflowRecordApprovals} from './workflows-record-approvals';
import {ManualEntry} from './manual-entry';
import {DoNotContactReason} from './do-not-contact-reason';
import {RecordEditor} from './record-editor';
import './records.css';
import {useEffect,useState} from 'react';
import {Link,useNavigate,useParams} from '@tanstack/react-router';
import {OperatorShell,OperatorState} from './operator-shell';
import {recordsRequest,type CustomerRecord} from './records-api';
import {listPath,recordHref} from './records-query';

/** A contact or a company at its own address. */
export function RecordDetailPage({kind}:{kind:'contact'|'company'}){
 const {id}=useParams({strict:false}) as {id:string},navigate=useNavigate();
 const [detail,setDetail]=useState<any>(),[settings,setSettings]=useState<any>(),[options,setOptions]=useState<{companies:CustomerRecord[];contacts:CustomerRecord[]}>({companies:[],contacts:[]}),[editing,setEditing]=useState(false),[entry,setEntry]=useState<any>(),[error,setError]=useState(''),[saveMessage,setSaveMessage]=useState('');
 async function open(){try{const [record,workspace,companies,contacts]=await Promise.all([recordsRequest<any>(`records/${kind}/${id}`),recordsRequest('settings'),recordsRequest<{records:CustomerRecord[]}>('records/company'),recordsRequest<{records:CustomerRecord[]}>('records/contact')]);setDetail(record);setSettings(workspace);setOptions({companies:companies.records,contacts:contacts.records});}catch(e){setError((e as Error).message);}}
 useEffect(()=>{setDetail(undefined);setEditing(false);setEntry(undefined);void open();},[kind,id]);
 if(!detail)return <OperatorShell title={kind==='contact'?'Contact':'Company'}>{error?<OperatorState kind="error">{error}</OperatorState>:<OperatorState>Loading…</OperatorState>}</OperatorShell>;
 const title=detail.record.name??detail.record.email;
 return <OperatorShell title={title}><div className="records-workspace">
  {error?<OperatorState kind="error">{error}</OperatorState>:null}{saveMessage&&<p role="status">{saveMessage}</p>}
  {editing?<RecordEditor key={detail.record.id} kind={kind} record={detail.record} companies={[...new Map([...options.companies,...(detail.company?[detail.company]:[])].map(c=>[c.id,c])).values()]} contacts={options.contacts} settings={settings} onSaved={(_,changed)=>{setSaveMessage(changed?'':'No changes to save.');setEditing(false);void open();}} onCancel={()=>setEditing(false)}/>:<>
  <div className="operator-surface workbench-actions"><button onClick={()=>{setSaveMessage('');setEditing(true);}}>Edit details</button>{kind==='contact'&&detail.record.contactability==='do_not_contact'?<ClearDoNotContact record={detail.record} onCleared={()=>void open()}/>:null}<DeleteRecord kind={kind} id={detail.record.id} onDeleted={async()=>{await navigate({to:listPath[kind]});}}/></div>
  {kind==='contact'?<><MeetingWriteback key={`calendar-${detail.record.id}`} kind={kind} id={detail.record.id} contacts={[detail.record]} onChanged={()=>void open()}/><ReviewedCall key={detail.record.id} contacts={[detail.record]}/></>:null}
  <div className="workbench-create"><section className="operator-surface workbench-form"><h2>Record details</h2><RecordOwner key={`owner-${kind}-${detail.record.id}`} kind={kind} ids={[detail.record.id]} operators={settings?.operators??[]} currentOwner={detail.ownership?.ownerName??null} onChanged={open}/><RecordDetailFields record={detail.record} workspace={settings?.workspace}/>{kind==='contact'?<DoNotContactReason record={detail.record}/>:null}</section>
  <aside className="operator-surface workbench-summary"><h2>Related records</h2>{detail.company?<p>Company: <a href={recordHref('company',detail.company.id)}>{detail.company.name}</a></p>:null}{detail.contacts.map((c:any)=><p key={c.id}><a href={recordHref('contact',c.id)}>{c.name??c.email}</a>{kind==='company'?c.relationship_primary?' · Primary company':' · Secondary company':''} · {c.contactability==='do_not_contact'?'Do not contact':'Contactable'}</p>)}{detail.opportunities.map((o:any)=><p key={o.id}><Link to="/app/opportunities/$id" params={{id:o.id}}>{o.title}</Link> · {o.stage_name??'Stage unavailable'} · {o.owner_name??'Unassigned'} · {settings?.workspace?formatCurrency(o.value_cents,settings.workspace):''}</p>)}{kind==='company'?<p>Open opportunity value: {settings?.workspace?formatCurrency(detail.openValueCents,settings.workspace):''}</p>:null}</aside></div>
  <RecordMail key={`mail-${kind}-${detail.record.id}`} kind={kind} id={detail.record.id}/>
  <BuyingContext key={`buying-${kind}-${detail.record.id}`} kind={kind} recordId={detail.record.id} onChanged={()=>void open()}/>
  <WorkflowRecordApprovals key={`workflow-approvals-${kind}-${detail.record.id}`} kind={kind} id={detail.record.id} workspace={settings?.workspace} onChanged={open}/>
  <CaptureProposals key={`proposals-${detail.record.id}`} recordType={kind} recordId={detail.record.id} onChanged={()=>void open()}/>
  <ManualEntry key={entry?.id??detail.record.id} kind={kind} id={detail.record.id} contacts={options.contacts} entry={entry} onSaved={()=>void open()}/>
  <section className="operator-surface workbench-form"><h2>Timeline</h2><ScrollToHash ready={detail.timeline.length>0}/>{detail.timeline.map((item:any)=><article key={item.id} id={`entry-${item.id}`}><h3>{mailEvidenceTitle(item.kind,item.signal_type??undefined)}</h3><MailEvidenceNote kind={item.kind} signalType={item.signal_type??undefined}/><p>Occurred {settings?.workspace?formatDateTime(item.occurred_at,settings.workspace):'Loading date…'} · Recorded {settings?.workspace?formatDateTime(item.recorded_at,settings.workspace):'Loading date…'} · Source: {item.kind.startsWith('provider.')?'SendGrid provider report':item.kind==='message.accepted'?'Mail provider acceptance receipt':item.source_name??item.source} · {item.actor_name??label(item.actor_type)}</p><RecordEntryDetails payload={JSON.parse(item.payload_json)}/><CapturedMailLinks payload={JSON.parse(item.payload_json)} onChanged={()=>open()}/>{item.kind.startsWith('manual.')&&<EntryPrivacy source="entry" id={item.id}/>} {item.kind.startsWith('manual.')&&!['twilio','calendar-writeback'].includes(item.source)?<><button onClick={()=>setEntry(item)}>Edit entry</button><DeleteTimelineEntry kind={kind} recordId={detail.record.id} entryId={item.id} onDeleted={()=>void open()}/></>:null}</article>)}</section>
  </>}
 </div></OperatorShell>;
}
export const ContactRecordPage=()=><RecordDetailPage kind="contact"/>;
export const CompanyRecordPage=()=><RecordDetailPage kind="company"/>;
