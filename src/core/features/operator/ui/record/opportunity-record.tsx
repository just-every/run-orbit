import {useCallback,useMemo,useState} from 'react';
import {Link,useParams} from '@tanstack/react-router';
import type {OpportunityContext} from '../../../relationships/contracts';
import {SavedLabel} from '../autosave/saved-label';
import {useAutosave,type Values} from '../autosave/use-autosave';
import {EvidenceActions} from '../evidence-actions';
import {operatorApi} from '../operator-api';
import {OperatorShell,OperatorState} from '../operator-shell';
import {recordsRequest} from '../records-api';
import {readOnboarding} from '../setup-line';
import {useOperatorResource} from '../use-operator-resource';
import {workbenchRequest} from '../workbench-api';
import {WorkflowRecordApprovals} from '../workflows-record-approvals';
import {FollowUpResults,type Outcomes} from '../follow-up-outcomes';
import {DealActivity,type DealMessages,type HandoffEntry} from './deal-activity';
import {DealContext} from './deal-context';
import {DealValues} from './deal-details';
import {DetailsPanel} from './details-panel';
import {NextAction} from './next-action';
import {DealPeople} from './people';
import {dealContextValues,patchRecord,readContext,readRecord,recordValues,saveDealContext,type DealContextValues} from './record-api';
import {RecordFoot} from './record-foot';
import {RecordFrame,RecordTitle} from './record-page';
import {useRefresh} from './use-refresh';
import {RecordedDetails} from './recorded-details';
import {useFieldDefinitions} from './custom-values';

/** An opportunity at /app/opportunities/<id>: one page, its next action first, its details beside the work, every
 * value saving as it changes. Its reads go out together; the secondary ones (mail, hand-offs, setup) never block it. */
export function OpportunityRecordPage(){
 const {id}=useParams({from:'/app/opportunities/$id'});
 const load=useCallback(async()=>{
  const [detail,settings,{opportunity},{drafts},context,configuration,messages,handoffs]=await Promise.all([
   readRecord<{record:Values;company:{id:string;name:string}|null;contacts:Values[]}>('opportunity',id),recordsRequest<any>('settings'),operatorApi.readOpportunity(id),operatorApi.listOpportunityDrafts(id),readContext<OpportunityContext>('opportunity',id),
   readOnboarding().catch(()=>null),workbenchRequest<DealMessages&{outcomes:Outcomes}>(`/opportunities/${id}/messages`).catch(()=>null),
   fetch(`/delegation/handoffs/${id}`,{credentials:'same-origin'}).then(response=>response.ok?response.json() as Promise<{tasks:HandoffEntry[]}>:{tasks:[]}).catch(()=>({tasks:[] as HandoffEntry[]})),
  ]);
  return {detail,settings,opportunity,drafts,context,configuration,messages,handoffs:handoffs.tasks};
 },[id]);
 const resource=useOperatorResource(`opportunity:${id}`,load),data=resource.data,reload=resource.reload;
 const definitions=useFieldDefinitions('opportunity');
 const recordCopy=useMemo(()=>data?recordValues(data.detail.record):null,[data?.detail]);
 const contextCopy=useMemo(()=>data?dealContextValues(data.context):null,[data?.context]);
 const record=useAutosave<Values>({key:`opportunity.${id}`,copy:recordCopy,version:copy=>copy.updated_at,
  send:(changes,base,_copy,init)=>patchRecord('opportunity',id,changes,base,init),
  reread:async()=>recordValues((await readRecord<{record:Values}>('opportunity',id)).record),onSaved:reload});
 const context=useAutosave<DealContextValues>({key:`deal-context.${id}`,copy:contextCopy,
  send:(changes,_base,copy,init)=>saveDealContext(id,changes,copy,init),
  reread:async()=>dealContextValues(await readContext<OpportunityContext>('opportunity',id)),onSaved:reload});
 const [composing,setComposing]=useState(false);
 useRefresh(reload);
 if(!data)return <OperatorShell title="Opportunity">{resource.error?<OperatorState kind="error">{resource.error.message}</OperatorState>:<OperatorState>Loading opportunity…</OperatorState>}</OperatorShell>;
 const {detail,settings,opportunity,drafts,messages,handoffs}=data,workspace=settings.workspace,name=String(record.value('title')??opportunity.title);
 const titles=new Map(opportunity.contacts.map(contact=>[contact.id,contact.jobTitle]));
 const scheduled=messages?.messages.filter(message=>message.state==='scheduled').length??0;
 const company=detail.company?<Link className="r-eyebrow-link" to="/app/companies/$id" params={{id:detail.company.id}}>{detail.company.name}</Link>:<span>Opportunity</span>;
 return <OperatorShell title={name} eyebrow={<span className="r-eyebrow">{company}<SavedLabel show={record.saved('title')}/></span>} heading={<RecordTitle form={record} field="title" label="Opportunity title" required="An opportunity needs a title."/>}>
  <RecordFrame
   waiting={<WorkflowRecordApprovals kind="opportunity" id={id} workspace={workspace} onChanged={reload}/>}
   next={<><NextAction opportunity={opportunity} presentation={workspace} aiConfigured={Boolean(data.configuration?.aiConfigured)} reload={reload} composing={composing} onCompose={()=>setComposing(!composing)}/>{composing?<div className="r-composer"><EvidenceActions opportunity={opportunity} reload={reload} mode="draft"/></div>:null}</>}
   activity={<DealActivity opportunity={opportunity} drafts={drafts} messages={messages} handoffs={handoffs} reload={reload}/>}
   folds={<><FollowUpResults outcomes={messages?.outcomes} presentation={workspace}/><RecordedDetails opportunity={opportunity} presentation={workspace} reload={reload}/></>}
   details={<DetailsPanel>
    <DealValues id={id} record={record} settings={settings} scheduled={scheduled} definitions={definitions} context={context}/>
    <DealPeople dealId={id} form={context} titles={titles}/>
    <DealContext form={context}/>
    <RecordFoot kind="opportunity" id={id} name={name} record={detail.record} deleteSentence={`Delete ${name}? Its messages and timeline go with it.`} onChanged={reload}/>
   </DetailsPanel>}
  />
 </OperatorShell>;
}
