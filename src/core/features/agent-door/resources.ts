import {AccessService} from '../access/service';
import {AnalyticsMetrics} from '../analytics/metrics';
import {NativeAnalyticsSources} from '../analytics/native-sources';
import {OperationsStore} from '../operations/store';
import {domainEventStatements} from '../effects/event-statements';
import {ForecastRepository} from '../forecast/repository';
import {classifications} from './tools';
import {ApiDeals} from '../api/resources';
import type {ApiCredential} from '../api/authority';
import {systemClock} from '../../platform/clock';
import {localState,localFence} from './credentials';
import type { ResourceDefinition, ResourceContext, ClassAndFacts } from '../../../base/modules/agent-door/types.ts';
import { record } from './native';
import { DraftsRepository } from '../drafts/repository';
import { snapshot } from '../delegation/evidence';
import { buildMeetingPlan } from '../today/meeting-plan';
import { dealRisks } from '../risks/findings';
import { isFullOperator } from '../access/identity-class';
import { privateField } from '../access/field-policy';
const classes=(value:unknown):ClassAndFacts[]=>{
 const protectedContent=(v:unknown):boolean=>!!v&&typeof v==='object'&&Object.entries(v).some(([key,item])=>privateField(key)||protectedContent(item));
 return[{class:'standard',facts:{measure:1}},...(protectedContent(value)?[{class:'sensitive' as const,facts:{measure:1,kind:'protected_crm_content'}}]:[])];
};
function resource(uriTemplate:string,scope:string,read:(parts:string[],c:ResourceContext)=>Promise<unknown>):ResourceDefinition{
 return{uriTemplate,name:uriTemplate,scope,classes:['standard','sensitive'],classify:(r,c)=>uriTemplate==='orbit://records/{kind}/{id}'?classifications(c,String((r.json as {kind?:string})?.kind??'opportunity'),(r.json as {fields?:Record<string,unknown>;deal?:Record<string,unknown>})?.fields??(r.json as {deal?:Record<string,unknown>})?.deal??{}):classes(r.json),async read(uri,c){try{const json=await read(new URL(uri).pathname.split('/').filter(Boolean),c);return json?{json,untrusted:true}:null;}catch{return null;}}};
}
async function full(c:ResourceContext){if(!await isFullOperator(c.db,c.person.id))throw new Error('Not found');}
export function resources():ResourceDefinition[]{return[
 resource('orbit://records/{kind}/{id}','orbit.records.read',async(p,c)=>{await localFence('orbit.records.read',{kind:p[0],id:p[1]},c);const state=await localState(c.db,c);if(state?.type==='api')return new ApiDeals(c.db,systemClock).read(state.row as ApiCredential,p[1],JSON.parse((state.row as ApiCredential).fields_json));return record(c,p[0],p[1]);}),
 resource('orbit://signals/{id}','orbit.signals.read',async(p,c)=>{await full(c);await localFence('orbit.signals.read',{id:p[0]},c);return c.db.prepare('SELECT id,source_id,type,occurred_at,received_at,payload_json FROM signals WHERE id=?').bind(p[0]).first();}),
 resource('orbit://meetings/{id}/plan','orbit.meetings.read',async(p,c)=>{await full(c);return buildMeetingPlan(c.db,p[0],{operatorId:c.person.id});}),
 resource('orbit://opportunities/{id}/risks','orbit.risks.read',async(p,c)=>{await full(c);return dealRisks(c.db,p[0]);}),
 resource('orbit://drafts/{id}','orbit.drafts.read',async(p,c)=>{await full(c);return new DraftsRepository(c.db).findDraft(p[0]);}),
 resource('orbit://outreach/{id}','orbit.outreach.read',async(p,c)=>{await full(c);return c.db.prepare('SELECT id,draft_id,revision,contact_id,recipient_email,subject,body,state,failure,scheduled_at,attempt_count FROM outbound_messages WHERE id=?').bind(p[0]).first();}),
 resource('orbit://operations/{id}','orbit.handoffs.read',async(p,c)=>{await full(c);const task=await c.db.prepare('SELECT opportunity_id FROM handoff_tasks WHERE id=?').bind(p[0]).first<{opportunity_id:string}>();if(!task)return null;const target=`opportunities/${task.opportunity_id}/handoffs/${p[0]}`;await localFence('orbit.handoffs.read',{target},c);return snapshot(c.db,target);}),
 resource('orbit://reports/{id}','orbit.reports.read',async(p,c)=>{const access=new AccessService(c.db),actor=await access.resolveAgentContext(c.person.id,c.agent.id,crypto.randomUUID());return new AnalyticsMetrics(new OperationsStore(c.db,access,domainEventStatements),new NativeAnalyticsSources(access)).read(actor,p[0]);}),
 resource('orbit://forecasts/{id}','orbit.forecasts.read',async(p,c)=>{const access=new AccessService(c.db),actor=await access.resolveAgentContext(c.person.id,c.agent.id,crypto.randomUUID()),repository=new ForecastRepository(c.db);return p[0]==='workspace'?repository.read(actor):repository.snapshot(actor,p[0]);}),
 resource('orbit://access/{id}','orbit.access.read',async(p,c)=>{await full(c);return{grants:(await c.db.prepare('SELECT id,resource_type,resource_id,actions_json,fields_json,expires_at,revoked_at FROM access_grants WHERE subject_id=?').bind(p[0]).all()).results};})
];}
