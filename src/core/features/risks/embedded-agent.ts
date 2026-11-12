import type {AgentDoor,CallResult} from '../../../base/modules/agent-door/index.ts';
import {hash} from '../delegation/protocol';
import {riskTaskContent} from './actions';
import type {dealRisks,Finding} from './findings';

type Risks=Omit<Awaited<ReturnType<typeof dealRisks>>,'dismissed'>;
export const dealRiskAgent=(sponsor:string)=>({id:`orbit-deal-risk:${sponsor}`,name:'Deal-risk agent',specialist:'sales rep'});
export interface RiskAgentCall {tool:string;finding:string|null;target?:string;answer:CallResult}
export interface RiskAgentRun {agent:ReturnType<typeof dealRiskAgent>;dealId:string;calls:RiskAgentCall[];filed:number;existing:number}

/** Stable native task identity includes the finding and its cited current evidence, never instructions from that evidence. */
export async function riskAgentTask(risks:Risks,finding:Finding,sponsor:string){
 const evidence=finding.citations.map(citation=>risks.evidence.find(item=>item.id===citation.evidenceId)!);
 const input={title:finding.nextTask,dueAt:finding.nextTaskDueAt??null,evidenceIds:finding.citations.map(item=>item.evidenceId)};
 const digest=await hash(JSON.stringify({deal:risks.deal.id,finding:finding.key,task:input,evidence}));
 return {target:`opportunities/${risks.deal.id}/handoffs/risk-${digest.slice(0,32)}`,key:`risk-${digest}`,
  content:riskTaskContent(risks,input,sponsor)};
}

/** Explicit single-deal run only. Every read and effect goes through the registry and its company decision. */
export async function runDealRiskAgent(door:AgentDoor,id:string,sponsor:string):Promise<RiskAgentRun>{
 const agent=dealRiskAgent(sponsor),who={person:{id:sponsor},agent,scopes:['risks:read','handoffs:read','handoffs:write']};
 const run:RiskAgentRun={agent,dealId:id,calls:[],filed:0,existing:0};
 const call=async(tool:string,args:Record<string,unknown>,finding:string|null=null,target?:string)=>{
  const answer=await door.invoke(tool,args,who);
  run.calls.push({tool,finding,...(target?{target}:{}),answer});return answer;
 };
 const read=await call('orbit.risks.read',{id});
 if(read.outcome!=='done')return run;
 const risks=(read.result as {risks:Risks}).risks;
 if(risks.deal.lifecycle!=='open')return run;
 for(const finding of risks.findings.filter(item=>!item.dismissed)){
  const task=await riskAgentTask(risks,finding,sponsor);
  const before=await call('orbit.handoffs.read',{target:task.target},finding.key,task.target);
  if(before.outcome!=='done')break;
  const saved=before.result as {revision:string;audienceRevision:string;value:{handoff:unknown}};
  // A completed or cancelled task stays the person's choice on rerun too.
  if(saved.value.handoff){run.existing++;continue;}
  const filed=await call('orbit.handoffs.upsert',{target:task.target,source_revision:saved.revision,
   audience_revision:saved.audienceRevision,content:task.content,idempotency_key:task.key},finding.key,task.target);
  if(filed.outcome!=='done')break;
  run.filed++;
 }
 return run;
}
