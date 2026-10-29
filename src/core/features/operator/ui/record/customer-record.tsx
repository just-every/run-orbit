import {useCallback,useEffect,useMemo,useState} from 'react';
import {Link,useParams,useRouterState} from '@tanstack/react-router';
import type {ContactContext} from '../../../relationships/contracts';
import {SavedLabel} from '../autosave/saved-label';
import {useAutosave,type Values} from '../autosave/use-autosave';
import {CaptureProposals} from '../capture-proposals';
import {DoNotContactReason} from '../do-not-contact-reason';
import {OperatorShell,OperatorState} from '../operator-shell';
import {RecordMailComposer,useRecordMail} from '../record-mail';
import {recordsRequest} from '../records-api';
import {useOperatorResource} from '../use-operator-resource';
import {WorkflowRecordApprovals} from '../workflows-record-approvals';
import {CompanyDetails} from './company-details';
import {ContactDetails} from './contact-details';
import {useFieldDefinitions} from './custom-values';
import {DetailsPanel} from './details-panel';
import {contactContextValues,patchRecord,readContext,readRecord,recordValues,saveContactContext,type ContactContextValues} from './record-api';
import {RecordActivity} from './record-activity';
import {RecordFoot} from './record-foot';
import {dealInNow,RecordNextAction} from './record-next-action';
import {RecordFrame,RecordTitle} from './record-page';
import {useRefresh} from './use-refresh';

/** A record opened just after it was created puts the caret in its first empty field (SL9). */
function useCaretOnCreate(ready:boolean){
 const created=useRouterState({select:state=>Boolean((state.location.state as {created?:boolean}|undefined)?.created)});
 useEffect(()=>{if(!ready||!created)return;const field=[...document.querySelectorAll<HTMLInputElement|HTMLTextAreaElement>('[data-testid="record-details"] :is(input:not([type=search]),textarea)')].find(element=>!element.value);field?.focus();},[ready,created]);
}

/** A contact or a company at its own address: what waits for a person, the next action (their deal in NOW), activity
 * with their mail, and their details beside the work, every value saving as it changes. */
function CustomerRecordPage({kind}:{kind:'contact'|'company'}){
 const {id}=useParams({strict:false}) as {id:string};
 const load=useCallback(async()=>{
  const [detail,settings,context]=await Promise.all([readRecord<any>(kind,id),recordsRequest<any>('settings'),kind==='contact'?readContext<ContactContext>('contact',id):Promise.resolve(null)]);
  return {detail,settings,context};
 },[kind,id]);
 const resource=useOperatorResource(`${kind}:${id}`,load),data=resource.data,reload=resource.reload;
 const definitions=useFieldDefinitions(kind),mail=useRecordMail(kind,id);
 const recordCopy=useMemo(()=>data?recordValues(data.detail.record):null,[data?.detail]),contextCopy=useMemo(()=>data?.context?contactContextValues(data.context):null,[data?.context]);
 const record=useAutosave<Values>({key:`${kind}.${id}`,copy:recordCopy,version:copy=>copy.updated_at,send:(changes,base,_copy,init)=>patchRecord(kind,id,changes,base,init),reread:async()=>recordValues((await readRecord<{record:Values}>(kind,id)).record),onSaved:reload});
 const context=useAutosave<ContactContextValues>({key:`contact-context.${id}`,copy:contextCopy,send:(changes,_base,copy,init)=>saveContactContext(id,changes,copy,init),reread:async()=>contactContextValues(await readContext<ContactContext>('contact',id)),onSaved:reload});
 const [writing,setWriting]=useState(false);
 useRefresh(reload);
 useCaretOnCreate(Boolean(data&&record.copy));
 if(!data)return <OperatorShell title={kind==='contact'?'Contact':'Company'}>{resource.error?<OperatorState kind="error">{resource.error.message}</OperatorState>:<OperatorState>Loading {kind}…</OperatorState>}</OperatorShell>;
 const {detail,settings}=data,row=detail.record,name=String(record.value('name')??row.name??row.email??(kind==='contact'?'This contact':'This company'));
 const deal=dealInNow(detail.opportunities),blocked=kind==='contact'&&row.contactability==='do_not_contact';
 const eyebrow=kind==='contact'&&detail.company?<Link className="r-eyebrow-link" to="/app/companies/$id" params={{id:detail.company.id}}>{detail.company.name}</Link>:<span>{kind==='contact'?'Contact':'Company'}</span>;
 const required=kind==='company'?'A company needs a name.':String(record.value('email')??'').trim()?undefined:'A contact needs a name or an email.';
 return <OperatorShell title={name} eyebrow={<span className="r-eyebrow">{eyebrow}<SavedLabel show={record.saved('name')}/></span>} heading={<RecordTitle form={record} field="name" label={kind==='contact'?'Contact name':'Company name'} required={required}/>}>
  <RecordFrame
   waiting={<><CaptureProposals whenWaiting recordType={kind} recordId={id} onChanged={reload}/><WorkflowRecordApprovals kind={kind} id={id} workspace={settings.workspace} onChanged={reload}/></>}
   next={<><RecordNextAction name={kind==='contact'?String(row.name??row.email??'them').split(/\s+/)[0]!:name} deal={deal} workspace={settings.workspace} writing={writing} onWrite={()=>setWriting(!writing)} email={kind==='contact'?`Email ${String(row.name??row.email??'them').split(/\s+/)[0]}`:'Write an email'} newDeal={kind==='contact'?{contact:id}:{company:id}}
     blocked={blocked?<div className="r-blocked"><p className="r-note r-note--danger">{name} is marked do not contact</p><DoNotContactReason record={row}/></div>:undefined}/>
    {writing&&!blocked?<div className="r-composer"><RecordMailComposer kind={kind} id={id} context={mail.context} deal={deal?.id}/></div>:null}</>}
   activity={<RecordActivity kind={kind} id={id} record={row} timeline={detail.timeline} contacts={detail.contacts} mail={mail.history} reloadMail={mail.reload} reload={()=>{reload();void mail.reload();}}/>}
   details={<DetailsPanel>
    {kind==='contact'?<ContactDetails id={id} record={record} detail={detail} settings={settings} definitions={definitions} context={context} onSaved={reload}/>:<CompanyDetails id={id} record={record} detail={detail} settings={settings} definitions={definitions} onSaved={reload}/>}
    <RecordFoot kind={kind} id={id} name={name} record={row} onChanged={reload} deleteSentence={kind==='contact'?`Delete ${name} and permanently erase their personal history? This also clears notifications and AI error details for their linked opportunities, including shared opportunities. AI usage totals remain.`:`Delete ${name}?`}/>
   </DetailsPanel>}
  />
 </OperatorShell>;
}
export const ContactRecordPage=()=><CustomerRecordPage kind="contact"/>;
export const CompanyRecordPage=()=><CustomerRecordPage kind="company"/>;
