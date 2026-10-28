import {defineTool, ToolRefusal, type ToolContext, type ResourceDefinition} from '../../../base/modules/agent-door/index.ts';
import {buildBrief} from '../today/brief';
import {buildMeetingPlan} from '../today/meeting-plan';
import {dealRisks} from '../risks/findings';
import {nativeAuthority} from '../delegation/native-authority';
import {hash} from '../delegation/protocol';
import type {PlatformBindings} from '../../platform/assets';
import {objectSchema,outputSchema,standard,string} from './records';

export async function fullSeller(bindings:PlatformBindings,ctx:{person:{id:string};clientId?:string}) {
  if(ctx.clientId?.startsWith('orbit-delegation:'))throw new ToolRefusal('insufficient_scope');
  await nativeAuthority(bindings.DB,ctx.person.id);
}

async function readSignal(bindings:PlatformBindings,id:string) {
  const signal=await bindings.DB.prepare('SELECT id,source_id,source_event_id,type,subject,occurred_at,received_at FROM signals WHERE id=?').bind(id).first();
  if(!signal)throw new ToolRefusal('resource_unavailable');
  const links=(await bindings.DB.prepare('SELECT record_type,record_id FROM signal_links WHERE signal_id=? ORDER BY record_type,record_id').bind(id).all()).results;
  return {signal,links};
}
export function evidenceTools(bindings:PlatformBindings) {
  const read = (area:string,title:string,description:string,clauses:string[],properties:Record<string,object>,run:(args:Record<string,unknown>,ctx:ToolContext)=>Promise<object>,required=Object.keys(properties)) => defineTool({
    name:`orbit.${area}.read`,title,description,clauses,scope:`${area}:read`,readOnly:true,inputSchema:objectSchema(properties as Record<string,Record<string,unknown>>,required),outputSchema,classes:['standard'],untrusted:true,
    classify:async(_args,ctx)=>{await fullSeller(bindings,ctx);return standard();},run:async(args,ctx)=>{await fullSeller(bindings,ctx);return {result:await run(args,ctx)};},
  });
  return [
    defineTool({name:'orbit.signals.list',title:'Find linked signal evidence',description:'List immutable native signal metadata on a current opportunity. It does not fetch providers or record new observations.',scope:'signals:read',readOnly:true,inputSchema:objectSchema({opportunity_id:string}),outputSchema,classes:['standard'],clauses:['SIGNAL-001'],untrusted:true,classify:async(_args,ctx)=>{await fullSeller(bindings,ctx);return standard();},run:async(args,ctx)=>{await fullSeller(bindings,ctx);return {result:{signals:(await bindings.DB.prepare("SELECT s.id,s.type,s.subject,s.occurred_at,s.received_at FROM signals s JOIN signal_links l ON l.signal_id=s.id WHERE l.record_type='opportunity' AND l.record_id=? ORDER BY s.occurred_at DESC,s.id LIMIT 50").bind(args.opportunity_id).all()).results}};}}),
    read('signals','Read immutable signal evidence','Read the native signal and explicit record links. A signal is evidence, never approval.',['SIGNAL-001'],{id:string},args=>readSignal(bindings,String(args.id))),
    read('briefs','Prepare the seller’s day','Read the native brief with cited current records. Forecasts, promises and delivery remain independent facts.',['BRIEF-001','BRIEF-002'],{},async(_args,ctx)=>({brief:await buildBrief(bindings.DB,{operatorId:ctx.person.id})})),
    read('meetings','Read a cited meeting plan','Read the real meeting plan, unresolved attendees and cited evidence without creating a draft or sending.',['BRIEF-004'],{id:string},async(args,ctx)=>({plan:await buildMeetingPlan(bindings.DB,String(args.id),{operatorId:ctx.person.id})})),
    read('risks','Read opportunity risks','Read native findings and cited evidence; no generated causal outcome is implied.',['AGENT-001'],{id:string},async args=>({risks:await dealRisks(bindings.DB,String(args.id))})),
    read('sources','Read source metadata','Read source configuration metadata and intake status. Signing and provider credentials are excluded.',['SIGNAL-001'],{},async()=>({sources:(await bindings.DB.prepare('SELECT id,name,type,enabled,created_at,updated_at FROM signal_sources ORDER BY id').all()).results})),
    read('operations','Read native change witness','Read stable native state digests covering CRM fields, source-bound handoffs, drafts, outreach, timeline and current authority. It performs no provider or scheduler work.',['DELEGATE-001','RECORD-018'],{},async()=>{
      const result:Record<string,{rows:number;sha256:string}>={};
      for(const table of ['graph_records','handoff_tasks','handoff_contacts','drafts','outbound_messages','record_mail_drafts','record_mail_outbound_messages','record_mail_context','analytics_definitions','analytics_snapshots','analytics_snapshot_sources','analytics_report_shares','record_ownership','record_ownership_history','opportunity_contacts','evaluations','recommendations','recommendation_evidence','notifications','record_mutation_jobs','graph_workspace_epochs','forecast_revisions','domain_events','domain_audit','timeline_entries','timeline_entry_records','audit_entries','operators','access_memberships','access_grants']) {
        const rows=(await bindings.DB.prepare(`SELECT * FROM ${table}`).all()).results;
        const serialized=rows.map(row=>JSON.stringify(Object.fromEntries(Object.entries(row).sort(([a],[b])=>a.localeCompare(b))))).sort();
        result[table]={rows:rows.length,sha256:await hash(JSON.stringify(serialized))};
      }
      return result;
    }),
  ];
}
export function evidenceResources(bindings:PlatformBindings):ResourceDefinition[] {
  return [
    {uriTemplate:'orbit://signals/{id}',name:'Immutable signal',tool:'orbit.signals.read',pattern:/^orbit:\/\/signals\/([^/?#]+)$/},
    {uriTemplate:'orbit://meetings/{id}/plan',name:'Meeting plan',tool:'orbit.meetings.read',pattern:/^orbit:\/\/meetings\/([^/?#]+)\/plan$/},
    {uriTemplate:'orbit://opportunities/{id}/risks',name:'Opportunity risks',tool:'orbit.risks.read',pattern:/^orbit:\/\/opportunities\/([^/?#]+)\/risks$/},
  ].map(({uriTemplate,name,tool,pattern})=>({uriTemplate,name,scope:tool.split('.')[1]+':read',classes:['standard'],classify:standard,
    async read(uri,ctx) {
      const id=pattern.exec(uri)?.[1];if(!id)return null;
      try {
        await fullSeller(bindings,ctx);
        const result=tool==='orbit.signals.read'?await readSignal(bindings,id):tool==='orbit.meetings.read'?{plan:await buildMeetingPlan(bindings.DB,id,{operatorId:ctx.person.id})}:{risks:await dealRisks(bindings.DB,id)};
        return {json:result,untrusted:true};
      } catch {return null;}
    }}));
}
