import {writeHandoff} from '../delegation/effects';
import {snapshot} from '../delegation/evidence';
import {random} from '../delegation/protocol';
import {relationshipActivity} from '../relationships/activity';
import type {StakeholderRole} from '../relationships/contracts';
import {requireRecord} from '../records/shared';
import {readOpportunityContext} from '../relationships/opportunity';
import {TodayError} from '../today/errors';
import {dealRisks} from './findings';

// Reasons are free text: attribute them to the deal's stakeholders too, so erasing a contact removes them.
async function refs(db:D1Database,id:string){await requireRecord(db,'opportunity',id);return [{kind:'opportunity' as const,id},...(await readOpportunityContext(db,id)).stakeholders.map(person=>({kind:'contact' as const,id:person.contactId}))];}

/** A dismissal keeps its reason on the deal's timeline; the finding stays dismissed until its evidence changes. */
export async function dismissFinding(db:D1Database,id:string,input:{key:string;title:string;reason:string},actor:string){
 await db.batch(relationshipActivity(db,actor,'risk.dismissed','Dismissed a deal risk',await refs(db,id),{key:input.key,title:input.title,reason:input.reason}));
 return {key:input.key,dismissed:true};
}

/** Adjusts which stakeholder roles this deal must have recorded, with the reason attributed on its timeline. */
export async function adjustRoleRule(db:D1Database,id:string,input:{role:StakeholderRole;required:boolean;reason:string},actor:string){
 await db.batch(relationshipActivity(db,actor,'risk.rule_adjusted',input.required?'Required a stakeholder role':'Stopped requiring a stakeholder role',await refs(db,id),input));
 return input;
}

/** A person approves a proposed next task: an internal handoff citing current evidence. It never changes stage, amount, close date, forecast or commitments, and sends nothing. */
export async function approveTask(db:D1Database,id:string,input:{title:string;dueAt:string|null;evidenceIds:string[]},actor:string){
 const current=new Map((await dealRisks(db,id)).evidence.map(item=>[item.id,item.ref]));
 const refs=input.evidenceIds.map(evidenceId=>current.get(evidenceId));
 if(!refs.length||refs.some(ref=>!ref))throw new TodayError(400,'A task must cite this deal\'s current recorded evidence.');
 const target=`opportunities/${id}/handoffs/${random().slice(0,32)}`,before=await snapshot(db,target,true);
 return writeHandoff(db,{operationKey:random().slice(0,64),operation:'orbit.handoff.upsert',target,expectedRevision:before.revision,expectedAudienceRevision:before.audience.audienceRevision,
  content:{title:input.title,description:'From a reviewed deal risk',assigneeId:actor,dueAt:input.dueAt,status:'open',evidence:[...new Set(refs as string[])]}},{actor});
}
