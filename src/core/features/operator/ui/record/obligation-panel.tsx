import {useCallback,useState,type FormEvent} from 'react';
import {useOperatorResource} from '../use-operator-resource';
import {OperatorState} from '../operator-shell';
import {formatDateTime,workspaceInstant,zoneLabel} from '../formatters';
import type {WorkspacePresentation} from '../operator-api';
import type {MeetingPlan} from '../today-api';
import './obligation.css';
import {useRefresh} from './use-refresh';

export async function obligationRequest<T>(path:string,body?:unknown):Promise<T>{
 const response=await fetch('/api/v1/obligations'+path,{method:body?'POST':'GET',credentials:'same-origin',headers:{'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const value=await response.json() as {error?:string};if(!response.ok)throw new Error(value.error??'The follow-up could not be saved.');return value as T;
}
type FollowUp={id:string;title:string;owner_name:string;due_at:string;meeting_id:string|null;draft_id:string|null;response_evidence_id:string|null;goal_stage_name:string;goalState:string;messageState:string;failure:string|null;stop_condition:string;closed_at:string|null;closed_reason:string|null;paused:number};
function StopFollowUp({item,onChanged}:{item:FollowUp;onChanged:()=>void}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function stop(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError('');const form=new FormData(event.currentTarget);try{await obligationRequest('/'+item.id+'/stop',{reason:String(form.get('reason'))});setOpen(false);onChanged();}catch(error){setError((error as Error).message);}finally{setBusy(false);}}
 return open?<form className="obligation-form" onSubmit={stop}><label>Reason for stopping<input name="reason" required maxLength={1000}/></label><div className="obligation-actions"><button className="operator-button" disabled={busy}>Confirm stop</button><button type="button" className="operator-text-button" onClick={()=>setOpen(false)}>Cancel</button></div>{error&&<OperatorState kind="error">{error}</OperatorState>}</form>:<button className="operator-text-button" type="button" onClick={()=>setOpen(true)}>Stop follow-up</button>;
}
/** Message response and deal advancement are deliberately independent visible states. */
export function ObligationPanel({opportunityId,presentation,refreshKey=0}:{opportunityId:string;presentation:WorkspacePresentation;refreshKey?:number}){
 const load=useCallback(()=>obligationRequest<{obligations:FollowUp[]}>('/opportunities/'+opportunityId),[opportunityId,refreshKey]);
 const resource=useOperatorResource('obligations:'+opportunityId+':'+refreshKey,load);
 useRefresh(resource.reload);
 if(resource.error)return <OperatorState kind="error">{resource.error.message}</OperatorState>;
 if(!resource.data?.obligations.length)return null;
 return <section className="operator-surface obligation-panel" aria-label="Meeting follow-ups" data-testid="obligation-panel"><h2>Meeting follow-ups</h2>
  {resource.data.obligations.map(item=><article className="obligation-item" key={item.id} data-obligation-id={item.id} data-message-state={item.messageState} data-goal-state={item.goalState}>
   <h3>{item.title}</h3><p>{item.owner_name} · Due {formatDateTime(item.due_at,presentation)}</p>
   <p><strong>Message: {item.messageState.replaceAll('-',' ')}</strong></p>
   <p><strong>Advancement goal {item.goalState}: {item.goal_stage_name}</strong></p>
   {item.failure&&<OperatorState kind="error">{item.failure} Review the saved message and its provider outcome before taking another action.</OperatorState>}
   {Boolean(item.paused)&&!item.closed_at&&<p>Restored obligation paused. A fresh acceptance and exact-message approval are required before new work.</p>}
   <p>Stop conditions: {item.stop_condition}</p>
   <div className="obligation-actions">{item.messageState==='responded'&&item.response_evidence_id&&<a href={'/app/opportunities/'+opportunityId+'#entry-'+item.response_evidence_id}>Reply evidence</a>}{item.meeting_id&&<a href={'/app/meetings/'+item.meeting_id}>Meeting evidence and plan</a>}{item.draft_id&&<a href={'/app/drafts/'+item.draft_id}>Review exact draft</a>}</div>
   {item.closed_at?<p>Closed {formatDateTime(item.closed_at,presentation)} · {item.closed_reason}</p>:<StopFollowUp item={item} onChanged={resource.reload}/>}
  </article>)}
 </section>;
}
type ChoiceSettings={operators:{id:string;display_name:string;status:string;collaborator:number}[];stages:{id:string;name:string;pipeline_id:string;position:number}[]};
/** A completed meeting is the only entry point for accepting this bounded follow-up. */
export function MeetingFollowUpEntry({plan,presentation}:{plan:MeetingPlan;presentation:WorkspacePresentation}){
 const [open,setOpen]=useState(false),[settings,setSettings]=useState<ChoiceSettings|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[version,setVersion]=useState(0);
 const opportunity=plan.opportunities.find(item=>item.id===plan.primaryOpportunityId);
 async function begin(){setError('');try{const response=await fetch('/api/v1/settings',{credentials:'same-origin'});if(!response.ok)throw new Error('Workspace choices could not be loaded.');setSettings(await response.json());setOpen(true);}catch(error){setError((error as Error).message);}}
 async function accept(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError('');const form=new FormData(event.currentTarget);try{await obligationRequest('',{meetingId:plan.meeting.signalId,opportunityId:plan.primaryOpportunityId,contactId:String(form.get('contactId')),ownerId:String(form.get('ownerId')),dueAt:workspaceInstant(String(form.get('dueAt'))),goalStageId:String(form.get('goalStageId')),title:String(form.get('title')),stopCondition:String(form.get('stopCondition'))});setOpen(false);setVersion(value=>value+1);}catch(error){setError((error as Error).message);}finally{setBusy(false);}}
 if(!plan.primaryOpportunityId||!opportunity)return null;
 const current=settings?.stages.find(stage=>stage.id===opportunity.stageId),goals=settings?.stages.filter(stage=>stage.pipeline_id===current?.pipeline_id&&stage.position>current.position)??[];
 return <section className="obligation-entry" aria-label="Follow up after the meeting">
  {plan.meeting.status==='completed'&&<>{!open?<button className="operator-button" type="button" onClick={()=>void begin()}>Accept meeting follow-up</button>:<form className="operator-surface obligation-form" onSubmit={accept}>
   <h2>Accept meeting follow-up</h2><p>The completed meeting is cited as evidence. Customer mail needs a separate exact-draft approval.</p>
   <label>Follow-up title<input name="title" required maxLength={300} defaultValue={'Follow up: '+plan.meeting.subject}/></label>
   <label>Human owner<select aria-label="Human owner" name="ownerId" required defaultValue={opportunity.ownerId??''}><option value="">Choose an owner</option>{settings?.operators.filter(person=>person.status==='active'&&!person.collaborator).map(person=><option key={person.id} value={person.id}>{person.display_name}</option>)}</select></label>
   <label>Recipient<select aria-label="Recipient" name="contactId" required><option value="">Choose a meeting contact</option>{plan.attendees.filter(person=>person.opportunities.some(item=>item.id===plan.primaryOpportunityId)&&person.contact.contactability==='contactable').map(person=><option key={person.contact.id} value={person.contact.id}>{person.contact.name??person.email??'Contact'}</option>)}</select></label>
   <label>Due ({zoneLabel()})<input type="datetime-local" name="dueAt" required/></label>
   <label>Advancement goal<select aria-label="Advancement goal" name="goalStageId" required><option value="">Choose a later stage</option>{goals.map(stage=><option key={stage.id} value={stage.id}>{stage.name}</option>)}</select></label>
   <label>Stop conditions<textarea aria-label="Stop conditions" name="stopCondition" required maxLength={1000} defaultValue="Stop when the goal stage is reached or a person explicitly stops this follow-up."/></label>
   <div className="obligation-actions"><button className="operator-button" disabled={busy||!goals.length}>Accept obligation</button><button type="button" className="operator-text-button" onClick={()=>setOpen(false)}>Cancel</button></div>
  </form>}</>}
  {error&&<OperatorState kind="error">{error}</OperatorState>}
  <ObligationPanel opportunityId={plan.primaryOpportunityId} presentation={presentation} refreshKey={version}/>
 </section>;
}
