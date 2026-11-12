import {defineTool,ToolRefusal,type ToolContext} from '../../../base/modules/agent-door/index.ts';
import type {PlatformBindings} from '../../platform/assets';
import {proposalStatements,type ProposalDraft} from '../capture/proposals';
import {proposalKey,graphProposalIdentity} from '../capture/proposal-identity';
import {captureFences} from '../capture/fences';
import {audit} from '../records/shared';
import {bearer,currentGrant} from '../delegation/authority';
import {nativeAuthority} from '../delegation/native-authority';
import {AgentAccess,agentDatabase} from './native-access';
import {objectSchema,outputSchema,standard,string} from './records';

const citation=objectSchema({quote:{type:'string',minLength:1,maxLength:1000},label:{type:'string',enum:['observed','inferred']}});
const correction=()=>objectSchema({id:string,value:{type:'string',minLength:1,maxLength:200},citation},['id','value','citation']);
interface Citation {quote:string;label:'observed'|'inferred'}
interface Correction {id:string;value:string;citation:Citation}
interface Input {company_id:string;signal_id:string;job_change:Correction;close_date:Correction;question:Citation}

/** Only already captured, explicitly selected message evidence enters this call.
 * Text supplies citations, never code, authority, policy or a contactability value. */
async function prepared(bindings:PlatformBindings,args:Record<string,unknown>,ctx:ToolContext){
 const input=args as unknown as Input,db=bindings.DB,access=new AgentAccess(bindings,ctx);
 await nativeAuthority(db,ctx.person.id);
 const actor=await access.selectedGraph([`companies/${input.company_id}`,`contacts/${input.job_change.id}`,`opportunities/${input.close_date.id}`,`signals/${input.signal_id}`]);
 const row=await db.prepare(`SELECT i.id AS item_id,i.body,i.headers,i.captured_at,s.id,s.source_id,s.source_event_id,s.occurred_at,s.subject,
  c.name,c.connection_id,c.last_success_at FROM capture_items i JOIN signals s ON s.id=i.signal_id AND s.source_id=i.source_id
  JOIN capture_sources c ON c.id=s.source_id JOIN signal_sources source ON source.id=c.id
  WHERE s.id=? AND i.kind='message' AND c.state<>'disconnected' AND source.enabled=1
  AND EXISTS(SELECT 1 FROM contacts person WHERE person.id=? AND person.company_id=?)
  AND EXISTS(SELECT 1 FROM opportunities deal WHERE deal.id=? AND deal.company_id=?)
  AND (EXISTS(SELECT 1 FROM signal_links l WHERE l.signal_id=s.id AND l.record_type='company' AND l.record_id=?)
    OR EXISTS(SELECT 1 FROM capture_proposals p WHERE p.signal_id=s.id AND json_extract(p.details_json,'$.companyId')=?))`)
  .bind(input.signal_id,input.job_change.id,input.company_id,input.close_date.id,input.company_id,input.company_id,input.company_id)
  .first<{item_id:string;captured_at:string;last_success_at:string|null;body:string;headers:string;id:string;source_id:string;source_event_id:string;occurred_at:string;subject:string;name:string;connection_id:string|null}>();
 if(!row)throw new ToolRefusal('resource_unavailable');
 const lines=row.body.replace(/\r\n?/g,'\n').split('\n');
 for(const cite of [input.job_change.citation,input.close_date.citation,input.question])if(!lines.includes(cite.quote))throw new ToolRefusal('invalid_arguments');
 const contact=await db.prepare('SELECT job_title FROM contacts WHERE id=?').bind(input.job_change.id).first<{job_title:string|null}>();
 const deal=await db.prepare('SELECT expected_close_at FROM opportunities WHERE id=?').bind(input.close_date.id).first<{expected_close_at:string|null}>();
 if(!contact||!deal)throw new ToolRefusal('resource_unavailable');
 if(await db.prepare("SELECT 1 FROM opportunity_stakeholder_roles roles,json_each(roles.roles_json) role WHERE roles.opportunity_id=? AND role.value='decision_maker' LIMIT 1").bind(input.close_date.id).first())throw new ToolRefusal('revision_conflict');
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(input.close_date.value)||!Number.isFinite(Date.parse(input.close_date.value)))throw new ToolRefusal('invalid_arguments');
 return {input,access,actor,row,contact,deal};
}
export function graphTools(bindings:PlatformBindings){
 return [defineTool({name:'orbit.graph.propose',title:'Propose cited account corrections',
  description:'From explicitly selected captured mail, propose a contact job title correction, a conflicting deal close date and a missing decision-maker question. Native review applies each separately; this call never changes CRM fields or contactability.',
  scope:'graph:write',readOnly:false,classes:['standard'],clauses:['AGENT-001'],untrusted:true,
  inputSchema:objectSchema({company_id:string,signal_id:string,job_change:correction(),close_date:correction(),question:citation}),outputSchema,
  target:args=>({kind:'contact',id:String((args.job_change as Correction).id)}),
  classify:async(args,ctx)=>{await prepared(bindings,args,ctx);return standard();},
  summary:async(args,ctx)=>{const {input,row}=await prepared(bindings,args,ctx);return {target:{id:input.company_id},items:[`Evidence: ${row.id}`,`Occurred: ${row.occurred_at}`,input.job_change.citation.quote,input.close_date.citation.quote,input.question.quote,'Each proposal still requires native review']};},
  run:async(args,ctx)=>{
   const {input,access,actor,row,contact,deal}=await prepared(bindings,args,ctx),db=agentDatabase(bindings.DB,access,actor,ctx),at=new Date(ctx.now()).toISOString();
   const details=(cite:Citation)=>({graphProposal:true,companyId:input.company_id,contactIds:[input.job_change.id],connectionId:row.connection_id,preparedBy:ctx.actor,label:cite.label,quote:[cite.quote]});
   const drafts:ProposalDraft[]=[
    {kind:'set_field',recordType:'contact',recordId:input.job_change.id,field:'job_title',current:contact.job_title,value:input.job_change.value,details:details(input.job_change.citation)},
    {kind:'set_field',recordType:'opportunity',recordId:input.close_date.id,field:'expected_close_at',current:deal.expected_close_at,value:input.close_date.value,details:details(input.close_date.citation)},
    {kind:'question',recordType:'opportunity',recordId:input.close_date.id,current:null,value:'Who is the decision-maker for this deal?',details:details(input.question)},
   ];
   const evidence={source:row.name,sender:/^From: (.+)$/mi.exec(row.headers)?.[1]??null,date:row.occurred_at,subject:row.subject,signalId:row.id,itemId:row.item_id,eventId:row.source_event_id,capturedAt:row.captured_at,sourceLastSuccess:row.last_success_at};
   const identity=graphProposalIdentity(row.source_event_id,input.job_change.id,input.close_date.id);
   const statements=await proposalStatements(db,row.source_id,row.id,identity,evidence,drafts,at);
   const fence=db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'capture_graph_evidence_current',NULL WHERE NOT EXISTS(
    SELECT 1 FROM capture_items i JOIN contacts person ON person.id=? JOIN opportunities deal ON deal.id=?
    WHERE i.id=? AND i.signal_id=? AND i.body=? AND person.company_id=? AND deal.company_id=?
    AND person.job_title IS ? AND deal.expected_close_at IS ?
    AND NOT EXISTS(SELECT 1 FROM opportunity_stakeholder_roles roles,json_each(roles.roles_json) role WHERE roles.opportunity_id=deal.id AND role.value='decision_maker'))`)
    .bind(input.job_change.id,input.close_date.id,row.item_id,row.id,row.body,input.company_id,input.company_id,contact.job_title,deal.expected_close_at);
   try {await db.batch([...captureFences(db,{id:row.source_id,name:row.name,connection_id:row.connection_id}),fence,...statements,
    audit(db,ctx.person.id,'capture.graph_proposed','contact',input.job_change.id,{signalId:row.id,companyId:input.company_id})]);}
   catch(error){if(/runtime_controls|FOREIGN KEY constraint/.test(String(error)))throw new ToolRefusal('revision_conflict');throw error;}
   const keys=await Promise.all(drafts.map(draft=>proposalKey(row.source_id,identity,draft)));
   const proposals=(await bindings.DB.prepare(`SELECT id,kind,field,current_value,proposed_value,status,details_json FROM capture_proposals
    WHERE signal_id=? AND proposal_key IN(SELECT value FROM json_each(?)) ORDER BY id`).bind(row.id,JSON.stringify(keys)).all<{details_json:string}>()).results;
   ctx.emit('graph.proposed',`orbit://records/contact/${input.job_change.id}`);
   return {result:{proposals:proposals.map(({details_json,...proposal})=>({...proposal,details:JSON.parse(details_json)}))}};
  }})];
}

/** A selected graph client may follow its own value-free proposal notices only.
 * The shared feed also carries installation and approval events, so filter both
 * transport representations before any of that content reaches this client. */
export function selectedGraphEvents(bindings:PlatformBindings,door:import('../../../base/modules/agent-door/index.ts').AgentDoor):import('../../../base/modules/agent-door/index.ts').AgentDoor {
 const project=async(clientId:string|undefined,value:unknown)=>{
  if(!clientId?.startsWith('orbit-delegation:')||!value||typeof value!=='object'||!('events' in value))return value;
  const grant=await currentGrant(bindings.DB,clientId.slice('orbit-delegation:'.length)),targets:string[]=JSON.parse(grant.targets_json);
  const events=((value as {events:unknown[]}).events).filter((item:any)=>{
   const match=/^orbit:\/\/records\/contact\/([^/?#]+)$/.exec(item.uri??'');
   return item.type==='graph.proposed'&&match&&targets.includes(`contacts/${match[1]}`)&&item.actor?.agent?.id===grant.client_id;
  });
  return {events,cursor:(events.at(-1) as {id:string}|undefined)?.id??null};
 };
 return {...door,
  async invoke(name,args,who,proof){
   const result=await door.invoke(name,args,who,proof);
   return name==='orbit.events.list'?{...result,result:await project(who.clientId,result.result)}:result;
  },
  async handle(request){
   let selected:string|undefined;
   const header=request.headers.get('authorization')??'';
   if(request.method==='POST'&&new URL(request.url).pathname==='/mcp'){
    try{
     if(/^Bearer [a-f0-9]{64}$/.test(header))selected='orbit-delegation:'+(await bearer(bindings.DB,request)).id;
     else {
      // This unverified hint can only narrow the authenticated door's response.
      const encoded=header.slice(7).split('.')[1];
      const hint=encoded?JSON.parse(atob(encoded.replace(/-/g,'+').replace(/_/g,'/'))).client_id:undefined;
      if(typeof hint==='string'&&hint.startsWith('orbit-delegation:'))selected=hint;
     }
    }catch{}
   }
   const response=await door.handle(request);
   if(!selected||!response?.ok||!response.headers.get('content-type')?.includes('application/json'))return response;
   const payload=await response.json() as any,result=payload.result;
   if(Array.isArray(result?.structuredContent?.events)){
    result.structuredContent=await project(selected,result.structuredContent);
    result.content=[{type:'text',text:JSON.stringify(result.structuredContent)}];
   }
   return new Response(JSON.stringify(payload),{status:response.status,headers:response.headers});
  },
 };
}
