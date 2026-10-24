import {createApp} from './app';
import {createDependencies} from './dependencies';
import {createId} from '../../src/core/shared/ids';
import type {AIProvider} from '../../src/core/features/assistance/provider';

const daysAgo=(days:number)=>new Date(Date.now()-days*86400000).toISOString();

/** An operator session on the real application, driving only its HTTP doors. */
export async function todayApp(db:D1Database,options:{provider?:AIProvider;operatorId?:string;calling?:Pick<Parameters<typeof createApp>[0],'sourceSecurity'|'captureOrigin'|'captureFetch'>}={}){
 const deps=createDependencies(db),actor=options.operatorId??createId();
 await deps.auth.ensureOperator({id:actor,email:`${actor.toLowerCase()}@seller.test`,displayName:'Sam Seller'});
 await deps.workspace.ensureWorkspace({name:'Brief proof',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});
 if(!await db.prepare('SELECT 1 FROM pipeline_stages LIMIT 1').first())await deps.workspace.ensurePipelineStage({id:createId(),name:'Qualified',position:1});
 const session=await deps.auth.createSession(actor),app=createApp({database:db,assets:{fetch:async()=>new Response('test')},aiProvider:options.provider,...options.calling});
 const call=async(path:string,init:{method?:string;body?:unknown;form?:FormData}={})=>app.request(`https://orbit.test${path}`,{method:init.method??(init.body!==undefined||init.form?'POST':'GET'),headers:{cookie:`__Host-orbit_session=${session.token}`,origin:'https://orbit.test',...(init.form?{}:{'content-type':'application/json'})},...(init.form?{body:init.form}:init.body!==undefined?{body:JSON.stringify(init.body)}:{})});
 const json=async<T=any>(path:string,init:{method?:string;body?:unknown;form?:FormData}={},status?:number):Promise<T>=>{const response=await call(path,init);const text=await response.text();if(status!==undefined&&response.status!==status)throw new Error(`${path} answered ${response.status}: ${text}`);return JSON.parse(text) as T;};
 const stage=(await db.prepare('SELECT id FROM pipeline_stages ORDER BY position LIMIT 1').first<{id:string}>())!.id;
 return {actor,session,app,call,json,
  async opportunity(title:string,company:string,contact:string,email:string,valueCents=500000){return (await json<{id:string}>('/api/v1/workbench/opportunities',{body:{title,companyName:company,contactName:contact,email,stageId:stage,valueCents}},201)).id;},
  async event(opportunityId:string,type:string,subject:string,ageDays:number){return (await json<{id:string}>(`/api/v1/workbench/opportunities/${opportunityId}/events`,{body:{type,subject,occurredAt:daysAgo(ageDays),eventId:createId()}},201)).id;},
  async brief(){return (await json<{brief:import('../../src/core/features/today/types').Brief}>('/api/v1/today',{},200)).brief;},
 };
}
export type TodayApp=Awaited<ReturnType<typeof todayApp>>;
