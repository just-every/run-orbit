import {promiseLines} from '../today/promises';
import {briefPolicy} from '../today/window';
import {stakeholderRoles,type StakeholderRole} from '../relationships/contracts';
import {dealEvidence,type DealEvidence} from './evidence';

export type FindingKind='absent-role'|'missed-promise'|'stalled'|'opens-no-reply'|'conflicting-date'|'conflicting-price';
/** A cited observation, with any inference labelled by its source and kept apart from what was recorded. */
export interface Finding {key:string;kind:FindingKind;title:string;citations:{evidenceId:string;quote:string}[];inference:{source:'rule'|'ai';text:string}|null;nextTask:string;dismissed:{reason:string;by:string|null;at:string}|null}
export interface RoleRule {role:StakeholderRole;required:boolean;reason:string|null;by:string|null;at:string|null}

const DEFAULT_REQUIRED:StakeholderRole[]=['decision_maker'];
const roleLabel=(role:string)=>role.replaceAll('_','-');

/** Dismissals and rule adjustments are attributed deal timeline entries; the latest per key wins. */
async function decisions(db:D1Database,id:string){
 const rows=(await db.prepare("SELECT t.kind,t.actor_id AS actor,t.recorded_at AS at,t.payload_json AS payload FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE r.record_type='opportunity' AND r.record_id=? AND t.kind IN ('risk.dismissed','risk.rule_adjusted') ORDER BY t.recorded_at,t.id").bind(id).all<{kind:string;actor:string|null;at:string;payload:string}>()).results;
 const dismissed=new Map<string,NonNullable<Finding['dismissed']>>(),rules=new Map<StakeholderRole,RoleRule>(stakeholderRoles.map(role=>[role,{role,required:DEFAULT_REQUIRED.includes(role),reason:null,by:null,at:null}]));
 for(const row of rows){const payload=JSON.parse(row.payload) as {key?:string;role?:StakeholderRole;required?:boolean;reason:string};
  if(row.kind==='risk.dismissed'&&payload.key)dismissed.set(payload.key,{reason:payload.reason,by:row.actor,at:row.at});
  if(row.kind==='risk.rule_adjusted'&&payload.role&&rules.has(payload.role))rules.set(payload.role,{role:payload.role,required:Boolean(payload.required),reason:payload.reason,by:row.actor,at:row.at});}
 return {dismissed,rules:[...rules.values()]};
}

function ruleFindings(source:DealEvidence,rules:RoleRule[],promises:Awaited<ReturnType<typeof promiseLines>>,now:Date):Finding[]{
 const {deal,context,lastSend}=source,findings:Finding[]=[],primary=context.stakeholders.find(person=>person.isPrimary);
 const rolesQuote=source.evidence.find(item=>item.id===`${deal.id}#roles`)!.text;
 for(const rule of rules)if(rule.required&&!context.stakeholders.some(person=>person.roles.includes(rule.role)))
  findings.push({key:`absent-role:${rule.role}`,kind:'absent-role',title:`No contact is recorded as ${roleLabel(rule.role)} on this deal`,citations:[{evidenceId:`${deal.id}#roles`,quote:rolesQuote}],inference:null,nextTask:`Ask ${primary?.name??primary?.email??'your contact'} who acts as ${roleLabel(rule.role)} and record them on the deal`,dismissed:null});
 for(const line of promises)findings.push({key:`missed-promise:${line.id}`,kind:'missed-promise',title:`${line.detail}: ${line.title}`,citations:[{evidenceId:line.id,quote:line.title}],inference:null,nextTask:`Follow up on “${line.title}”`,dismissed:null});
 for(const taskId of source.overdueTasks){const task=source.evidence.find(item=>item.id===taskId)!;findings.push({key:`missed-promise:task:${taskId}`,kind:'missed-promise',title:`Task past its due time: ${task.text}`,citations:[{evidenceId:taskId,quote:task.text}],inference:null,nextTask:`Complete or reschedule “${task.text}”`,dismissed:null});}
 const stageEvidence=source.evidence.find(item=>item.id===source.stage.evidenceId)!,days=Math.floor((now.getTime()-Date.parse(source.stage.since))/86400000);
 const repliedSince=source.evidence.some(item=>item.label==='Customer reply'&&item.occurredAt!==null&&item.occurredAt>=source.stage.since);
 if(days>source.stage.intervalDays&&!repliedSince)findings.push({key:`stalled:${source.stage.evidenceId}`,kind:'stalled',title:`No stage change for ${days} days`,citations:[{evidenceId:source.stage.evidenceId,quote:stageEvidence.text}],
  inference:{source:'rule',text:`Longer than the ${source.stage.intervalDays}-day stale interval for this stage, with no customer reply recorded since.`},nextTask:`Agree a dated next step with ${primary?.name??primary?.email??'the buyer'} or close the deal`,dismissed:null});
 if(lastSend){
  const opens=source.evidence.filter(item=>lastSend.opens.includes(item.id));
  const replied=source.evidence.some(item=>item.label==='Customer reply'&&item.occurredAt!==null&&item.occurredAt>=lastSend.approvedAt);
  if(opens.length&&!replied)findings.push({key:`opens-no-reply:${lastSend.entryId}:${opens.length}`,kind:'opens-no-reply',title:`${opens.length} reported open${opens.length===1?'':'s'} and no reply since “${lastSend.subject}”`,
   citations:[{evidenceId:lastSend.entryId,quote:lastSend.subject},...opens.map(item=>({evidenceId:item.id,quote:item.text}))],
   inference:{source:'rule',text:'Provider open reports are unreliable; they may suggest the message was seen without a decision path. No human reply is recorded.'},nextTask:`Call ${lastSend.contact??'the contact'} about “${lastSend.subject}”`,dismissed:null});
 }
 return findings;
}

/** The deal's rule-based findings with its current evidence, rules and dismissals. Nothing here changes the deal. */
export async function dealRisks(db:D1Database,id:string,now=new Date()){
 const [source,policy,state]=await Promise.all([dealEvidence(db,id),briefPolicy(db),decisions(db,id)]);
 // Overdue promises on this deal or its evidence become cited evidence themselves.
 const promises=source.deal.lifecycle==='open'?(await promiseLines(db,now,policy,200)).filter(line=>line.records.some(record=>record.type==='opportunity'&&record.id===id)||source.evidence.some(item=>item.id===line.evidence.id)):[];
 for(const line of promises)source.evidence.push({id:line.id,ref:line.evidence.id,label:'Overdue promise, due',text:line.title,occurredAt:line.dueAt??line.occurredAt,confidence:'observed',href:'fixed' in line.link?line.link.fixed:`/app/opportunities/${id}`});
 const findings=source.deal.lifecycle==='open'?ruleFindings(source,state.rules,promises,now):[];
 return {deal:source.deal,evidence:source.evidence,rules:state.rules,findings:applyDismissals(findings,state.dismissed),dismissed:state.dismissed};
}
export function applyDismissals(findings:Finding[],dismissed:Map<string,NonNullable<Finding['dismissed']>>){return findings.map(finding=>({...finding,dismissed:dismissed.get(finding.key)??null}));}
export {decisions};
