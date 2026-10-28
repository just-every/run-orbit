import assert from 'node:assert/strict';
import {todayApp,type TodayApp} from './today-workspace';
import {createAIProvider} from '../../src/core/features/assistance/provider';
import {createId} from '../../src/core/shared/ids';

import type {SalesDayJourney} from './sales-sanity-day-workspace';
export async function reviewEvidence(journey:SalesDayJourney){
 const {db,lines,byKind,count,contactOf,overdueHandoff,captureUnknown}=journey;
 const config={OPENAI_API_KEY:'test-only',AI_MODEL:'test-model',AI_INPUT_COST_PER_MILLION:'1',AI_OUTPUT_COST_PER_MILLION:'2'};
 const operator=createId(),t=await todayApp(db,{provider:createAIProvider(config),operatorId:operator}),off=await todayApp(db,{operatorId:operator});
 const brief=await t.brief(),account=brief.accounts.find(a=>a.name==='Acme Logistics')!,ids=account.lines.map(l=>l.evidence.id);
 const original=fetch,sent:unknown[]=[];let answer:()=>Response=()=>new Response('down',{status:503});
 globalThis.fetch=async(_url,init)=>{sent.push(JSON.parse(JSON.parse(String(init!.body)).input));return answer();};
 const reply=(output:unknown)=>()=>Response.json({status:'completed',usage:{input_tokens:50,output_tokens:20},output:[{content:[{type:'output_text',text:JSON.stringify(output)}]}]});
 try{
  const preview=await t.json<{configured:boolean;request:{lines:{evidenceId:string}[]};requestHash:string}>('/api/v1/today/summary/preview',{body:{account:account.key}},200);
  assert.equal(preview.configured,true);assert.deepEqual(preview.request.lines.map(l=>l.evidenceId),ids);
  answer=reply({summary:'Ana asked for pricing and replied about the contract.',evidenceIds:[ids[0]]});
  const ok=await t.json<{status:string;summary:string;evidenceIds:string[]}>('/api/v1/today/summary',{body:{account:account.key,requestHash:preview.requestHash}},200);
  assert.equal(ok.status,'succeeded');assert.deepEqual(sent.at(-1),preview.request,'exactly the previewed request is sent');
  for(const output of [{summary:'No citations at all.',evidenceIds:[]},{summary:'Cites something invented.',evidenceIds:['invented-evidence']}]){
   answer=reply(output);const failed=await t.call('/api/v1/today/summary',{body:{account:account.key,requestHash:preview.requestHash}});
   assert.equal(failed.status,502);const body=await failed.json() as {status:string;summary?:string};assert.equal(body.status,'failed');assert.equal(body.summary,undefined);
  }
  assert.equal((await t.call('/api/v1/today/summary',{body:{account:account.key,requestHash:'0'.repeat(64)}})).status,409);
  answer=()=>new Response('down',{status:503});
  assert.equal((await t.call('/api/v1/today/summary',{body:{account:account.key,requestHash:preview.requestHash}})).status,502);
  const calls=(await db.prepare("SELECT status FROM ai_calls WHERE feature='brief.summary' ORDER BY created_at,id").all<{status:string}>()).results.map(r=>r.status);
  assert.deepEqual(calls,['success','failed','failed','failed']);
 }finally{globalThis.fetch=original;}
 // The brief is whole while the provider is down, and with no provider at all.
 const{generatedAt:_a,...whole}=await t.brief(),{generatedAt:_b,...unconfigured}=await off.brief();assert.deepEqual(unconfigured,whole);
 assert.equal((await off.json<{configured:boolean}>('/api/v1/today/summary/preview',{body:{account:account.key}},200)).configured,false);
 assert.equal((await off.call('/api/v1/today/summary',{body:{account:account.key,requestHash:'0'.repeat(64)}})).status,503);
 await agentRisks(journey,t,off);
}
/** AGENT-002 on current sources: recorded roles, commitments and calls; observation apart from inference; nothing moves the deal. */
async function agentRisks(journey:SalesDayJourney,t:TodayApp,off:TodayApp){
 const {db,count,contactOf,overdueHandoff}=journey;
 const deal=await t.opportunity('Northwind renewal','Northwind','Ana Ruiz','ana@northwind.test',1800000),ana=await contactOf(t,deal),risks=(app=t)=>app.json<any>(`/api/v1/risks/${deal}/findings`,{},200);
 const context=await t.json<any>(`/api/v1/relationships/opportunity/${deal}`,{},200);
 await t.json(`/api/v1/relationships/opportunity/${deal}`,{method:'PUT',body:{revision:context.revision,companyId:context.company?.id??null,primaryContactId:ana,stakeholders:[{contactId:ana,roles:['champion'],verified:true}],products:['Annual licence'],nextStep:'Send the order form',mutualCommitments:'Kickoff on 2026-11-03 at USD 18,000 per year once legal signs.'}},200);
 const call=await t.json<{id:string}>(`/api/v1/records/opportunity/${deal}/entries`,{body:{kind:'call',text:'Ana said kickoff is 2026-11-17 and the price she approved is USD 21,000 per year.',occurredAt:new Date(Date.now()-60000).toISOString(),durationMinutes:15}},200);
 const promised=await overdueHandoff(t,deal,'Send the security questionnaire');
 // Fixture: the deal entered its stage 30 days ago; nothing since moved it.
 await db.prepare('UPDATE opportunities SET created_at=? WHERE id=?').bind(new Date(Date.now()-30*86400000).toISOString(),deal).run();
 const overdueTask=await t.json<{id:string}>('/api/v1/tasks',{body:{title:'Send the pricing sheet',recordType:'opportunity',recordId:deal,ownerId:t.actor,dueAt:new Date(Date.now()-3600000).toISOString(),priority:'high',type:'follow_up',notes:'',recurrence:'none',timezone:'UTC',reminderMinutes:null}},201);
 const businessState=async()=>[await db.prepare('SELECT stage_id,value_cents,expected_close_at,lifecycle,closed_at FROM opportunities WHERE id=?').bind(deal).first(),(await t.json<any>(`/api/v1/relationships/opportunity/${deal}`,{},200)).stakeholders.map((s:any)=>[s.contactId,s.roles,s.verified]),await db.prepare('SELECT mutual_commitments,next_step FROM opportunity_buying_context WHERE opportunity_id=?').bind(deal).first(),await count('SELECT count(*) AS n FROM drafts'),await count('SELECT count(*) AS n FROM outbound_messages')];
 const before=await businessState(),first=await risks();
 const absent=first.findings.find((f:any)=>f.key==='absent-role:decision_maker');
 assert.deepEqual([absent.kind,absent.inference,absent.citations],['absent-role',null,[{evidenceId:`${deal}#roles`,quote:'Ana Ruiz: Champion (confirmed)'}]],'A missing role is an observation of recorded roles, never an invented stakeholder');
 assert.equal(first.evidence.find((e:any)=>e.id===call.id).label,'Logged call');
 assert.ok(first.findings.some((f:any)=>f.kind==='missed-promise'&&JSON.stringify(f.citations)===JSON.stringify([{evidenceId:`handoff-due:${promised}`,quote:'Send the security questionnaire'}])),'An overdue promise is cited exactly');
 assert.ok(first.findings.some((f:any)=>f.key===`missed-promise:task:${overdueTask.id}`&&f.citations[0].quote==='Send the pricing sheet'),'An overdue assigned task is a missed promise');
 const stalled=first.findings.find((f:any)=>f.kind==='stalled');assert.equal(stalled.inference.source,'rule');assert.match(stalled.citations[0].quote,/^In Qualified since \d{4}-\d{2}-\d{2}$/);
 // The conflict check sends only the previewed recorded lines; an unsupported citation fails the whole result.
 const original=fetch,sent:unknown[]=[];let answer=()=>new Response('down',{status:503});
 globalThis.fetch=async(_url,init)=>{sent.push(JSON.parse(JSON.parse(String(init!.body)).input));return answer();};
 const reply=(output:unknown)=>()=>Response.json({status:'completed',usage:{input_tokens:80,output_tokens:30},output:[{content:[{type:'output_text',text:JSON.stringify(output)}]}]});
 const conflict={kind:'conflicting-date',explanation:'The commitments and the logged call give different kickoff dates.',citations:[{evidenceId:`${deal}#commitments`,quote:'2026-11-03'},{evidenceId:call.id,quote:'2026-11-17'}],nextTask:'Confirm the kickoff date with Ana in writing'};
 try{
  const preview=await t.json<any>(`/api/v1/risks/${deal}/conflicts/preview`,{body:{}},200);
  assert.ok(preview.request.lines.some((l:any)=>l.evidenceId===call.id)&&preview.request.lines.every((l:any)=>!l.label.startsWith('Provider open')));
  for(const output of [{findings:[{...conflict,citations:[conflict.citations[0],{evidenceId:call.id,quote:'2026-12-01'}]}]},{findings:[{...conflict,citations:[conflict.citations[0],{evidenceId:'invented-evidence',quote:'2026-11-17'}]}]}]){
   answer=reply(output);const failed=await t.call(`/api/v1/risks/${deal}/conflicts`,{body:{requestHash:preview.requestHash}});assert.equal(failed.status,502);assert.equal((await failed.json() as any).findings,undefined);
  }
  answer=reply({findings:[conflict]});
  const checked=await t.json<any>(`/api/v1/risks/${deal}/conflicts`,{body:{requestHash:preview.requestHash}},200);assert.deepEqual(sent.at(-1),preview.request,'exactly the previewed request is sent');
  assert.deepEqual([checked.findings[0].kind,checked.findings[0].inference,checked.findings[0].citations],['conflicting-date',{source:'ai',text:conflict.explanation},conflict.citations]);
 }finally{globalThis.fetch=original;}
 assert.deepEqual((await db.prepare("SELECT status FROM ai_calls WHERE feature='deal.risks' ORDER BY created_at,id").all<{status:string}>()).results.map(r=>r.status),['failed','failed','success']);
 // A dismissal needs a reason and survives reload; a rule adjustment is attributed; an approved task cites current evidence only.
 assert.equal((await t.call(`/api/v1/risks/${deal}/dismissals`,{body:{key:absent.key,title:absent.title,reason:' '}})).status,400);
 await t.json(`/api/v1/risks/${deal}/dismissals`,{body:{key:absent.key,title:absent.title,reason:'Ana owns the business and signs herself'}},201);
 await t.json(`/api/v1/risks/${deal}/rules`,{body:{role:'procurement',required:true,reason:'Renewals above USD 15,000 need procurement'}},201);
 const reloaded=await risks();assert.deepEqual(reloaded.findings.find((f:any)=>f.key===absent.key).dismissed.reason,'Ana owns the business and signs herself');
 assert.ok(reloaded.findings.some((f:any)=>f.key==='absent-role:procurement'&&!f.dismissed));assert.equal(reloaded.rules.find((r:any)=>r.role==='procurement').by,t.actor);
 assert.equal((await t.call(`/api/v1/risks/${deal}/tasks`,{body:{title:'Uncited',dueAt:null,evidenceIds:['invented-evidence']}})).status,400);
 const task=await t.json<{observed:{target:string}}>(`/api/v1/risks/${deal}/tasks`,{body:{title:conflict.nextTask,dueAt:null,evidenceIds:conflict.citations.map(c=>c.evidenceId)}},201);
 assert.deepEqual(await db.prepare('SELECT title,status,assignee_id FROM handoff_tasks WHERE id=?').bind(task.observed.target.split('/')[3]).first(),{title:conflict.nextTask,status:'open',assignee_id:t.actor});
 assert.deepEqual(await businessState(),before,'Findings, checks, dismissals, rules and tasks never move stage, amount, close date, stakeholders, commitments or mail');
 assert.equal((await risks(off)).aiConfigured,false);assert.equal((await off.call(`/api/v1/risks/${deal}/conflicts`,{body:{requestHash:'0'.repeat(64)}})).status,503);
}
