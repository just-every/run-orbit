import type {RiskAgentRun} from '../../risks/embedded-agent';

const actions:Record<string,string>={
 'orbit.risks.read':'Read deal risks',
 'orbit.handoffs.read':'Check for an existing task',
 'orbit.handoffs.upsert':'File the proposed task',
};
const refusals:Record<string,string>={
 agents_paused:'Agents are paused. An owner can resume them in agent settings.',
 policy_unavailable:'The company agent policy is unavailable. An owner needs to refresh it.',
 policy_blocked:'The company agent policy blocks this step.',
 approval_rejected:'The approval was declined.',
 approval_expired:'The approval expired.',
 revision_conflict:'The record changed. Start the agent again to use the current record.',
};

/** Explain the next human action without exposing the agent protocol. Policy still decides every call. */
export function DealRiskAgentResult({run,title}:{run:RiskAgentRun;title:(key:string)=>string|undefined}){
 const missingPolicy=run.calls.find(call=>call.answer.code==='policy_unset');
 if(missingPolicy){
  const setup=missingPolicy.answer.fields?.setup_url;
  return <section aria-label="Deal-risk agent run">
   <p role="status">The agent could not start because your company’s agent policy has not been set. An owner must choose the policy before agents can work. No tasks were filed.</p>
   <a href={typeof setup==='string'?setup:'/agents'}>Set up company agent policy</a>
  </section>;
 }
 return <section aria-label="Deal-risk agent run">
  <p role="status">{run.agent.name}: {run.filed} tasks filed, {run.existing} already filed.</p>
  <ol>{run.calls.map((call,index)=><li key={index}>
   <strong>{actions[call.tool]??'Agent step'}</strong>{call.finding&&title(call.finding)&&<span> · {title(call.finding)}</span>}
   <p>{call.answer.outcome==='done'?(call.answer.review?'Done, saved for review.':'Done.'):
    call.answer.outcome==='pending'?'Waiting for approval.':refusals[call.answer.code??'']??'This step could not complete. Open agent activity for details.'}</p>
   {call.answer.review&&<a href="/agents">Review activity</a>}
   {call.answer.approval&&<a href={call.answer.approval.url}>Open approval</a>}
  </li>)}</ol>
  {run.calls.some(call=>call.answer.outcome==='refused')&&<a href="/agents">Open agent settings and activity</a>}
 </section>;
}
