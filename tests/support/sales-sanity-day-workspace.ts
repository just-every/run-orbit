import assert from 'node:assert/strict';
import {snapshot} from '../../src/core/features/delegation/evidence';
import {createId} from '../../src/core/shared/ids';
import {eml} from './capture-mail';
import type {TodayApp} from './today-workspace';
import type {Brief,BriefLine} from '../../src/core/features/today/types';
export function salesDayWorkspace(db:D1Database){
const lines=(brief:Brief)=>[...brief.accounts.flatMap(account=>account.lines),...brief.unresolved];
const byKind=(brief:Brief,kind:BriefLine['kind'])=>lines(brief).filter(line=>line.kind===kind);
const count=async(sql:string)=>(await db.prepare(sql).first<{n:number}>())!.n;

async function contactOf(t:TodayApp,opportunityId:string){return (await t.json<{opportunity:{contacts:{id:string}[]}}>(`/api/v1/opportunities/${opportunityId}`,{},200)).opportunity.contacts[0]!.id;}
async function overdueHandoff(t:TodayApp,opportunityId:string,title:string){
 const target=`opportunities/${opportunityId}/handoffs/${createId()}`,s=await snapshot(db,target,true);
 const response=await t.app.request('https://orbit.test/delegation/handoffs',{method:'POST',headers:{cookie:`__Host-orbit_session=${t.session.token}`,origin:'https://orbit.test','content-type':'application/json'},body:JSON.stringify({operationKey:createId(),operation:'orbit.handoff.upsert',target,expectedRevision:s.revision,expectedAudienceRevision:s.audience.audienceRevision,content:{title,description:'Promised on the last call',assigneeId:t.actor,dueAt:new Date(Date.now()-86400000).toISOString(),status:'open'}})});
 assert.equal(response.status,200,await response.clone().text());return target.split('/')[3]!;
}
async function captureUnknown(t:TodayApp,subject:string){
 const form=new FormData();form.append('includeUnknown','on');
 form.append('files',new File([eml({From:'Pat Unknown <pat@unmatched.test>',To:'seller@seller.test',Subject:subject,Date:new Date(Date.now()-3600000).toUTCString(),'Message-ID':`<${createId()}@unmatched.test>`},'Is anyone there?')],'unknown.eml',{type:'message/rfc822'}));
 const result=await t.json<{summary:unknown}>('/api/v1/capture/imports',{form},201);return result;
}



return {db,lines,byKind,count,contactOf,overdueHandoff,captureUnknown};
}
export type SalesDayJourney=ReturnType<typeof salesDayWorkspace>;
