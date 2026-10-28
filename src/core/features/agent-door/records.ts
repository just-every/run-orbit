import {defineTool, ToolRefusal, type ToolContext, type ResourceContext, type ClassAndFacts, type ResourceDefinition, type JsonSchema} from '../../../base/modules/agent-door/index.ts';
import {GraphRecords} from '../graph/repository';
import {RecordsRepository} from '../records/repository';
import type {RecordKind} from '../records/shared';
import {restrictedEdit} from '../access/native-boundary';
import {privatePaths} from '../access/field-policy';
import {domainEventStatements} from '../effects/event-statements';
import {nativeAuthority} from '../delegation/native-authority';
import {AgentAccess, agentDatabase} from './native-access';
import type {PlatformBindings} from '../../platform/assets';
import type {RecordProjection} from '../../shared/expansion-contracts';
import {localGrant} from './local-credentials';
import {currentGrant} from '../delegation/authority';

export const string = {type:'string',minLength:1,maxLength:200} as const;
export const kindSchema = {type:'string',enum:['company','contact','opportunity']} as const;
export const objectSchema = (properties:Record<string,JsonSchema>, required:string[]=Object.keys(properties)) => ({type:'object' as const,properties,required,additionalProperties:false});
export const outputSchema = {type:'object',additionalProperties:true} as const;
export const standard = ():ClassAndFacts[] => [{class:'standard',facts:{measure:1}}];
export const recordUri = (kind:string,id:string) => `orbit://records/${kind}/${id}`;

export async function nativeRecords(bindings:PlatformBindings,who:ToolContext|ResourceContext) {
  const access=new AgentAccess(bindings,who), actor=await access.context();
  return {access,actor,graph:new GraphRecords(bindings.DB,access,domainEventStatements)};
}
export async function readRecord(bindings:PlatformBindings,who:ToolContext|ResourceContext,kind:RecordKind,id:string,fields:string[]=[]) {
  await localGrant(bindings.DB,who,`${{company:'companies',contact:'contacts',opportunity:'opportunities'}[kind]}/${id}`,'crm.evidence.read');
  const {actor,graph}=await nativeRecords(bindings,who);
  await localGrant(bindings.DB,who,`${{company:'companies',contact:'contacts',opportunity:'opportunities'}[kind]}/${id}`,'crm.evidence.read');
  return graph.getRecord(actor,{...actor,type:kind,id},fields);
}
export async function recordRisk(db:D1Database,records:RecordProjection[]):Promise<ClassAndFacts[]> {
  for(const record of records) {
    const schema=await db.prepare('SELECT fields_json FROM schema_types WHERE workspace_id=? AND name=?').bind(record.ref.workspaceId,record.kind).first<{fields_json:string}>();
    const definitions=JSON.parse(schema?.fields_json??'{}');
    if(Object.keys(record.fields).some(field=>privatePaths(field,definitions,record.fields).length)) return [...standard(),{class:'sensitive',facts:{kind:'protected_crm_fields',measure:records.length}}];
  }
  return standard();
}

const fieldSchema={type:'object',properties:{
  name:{type:['string','null'],maxLength:500},title:{type:'string',minLength:1,maxLength:500},email:{type:['string','null'],maxLength:500},phone:{type:['string','null'],maxLength:500},
  job_title:{type:['string','null'],maxLength:500},timezone:{type:['string','null'],maxLength:500},primary_domain:{type:['string','null'],maxLength:500},
  stage_id:string,owner_id:{type:['string','null'],maxLength:200},company_id:{type:['string','null'],maxLength:200},value_cents:{type:'integer',minimum:0,maximum:100000000000},
  expected_close_at:{type:['string','null']},contact_ids:{type:'array',items:string,maxItems:1000},primary_contact_id:{type:['string','null'],maxLength:200},
  contactability:{type:'string',enum:['contactable','do_not_contact']},custom_fields:{type:'object',additionalProperties:{type:['string','number','boolean','null']}}
},additionalProperties:false};

export function recordTools(bindings:PlatformBindings) {
  const list = async(args:Record<string,unknown>,ctx:ToolContext) => {
    if(ctx.clientId?.startsWith('orbit-delegation:')) {
      const grant=await currentGrant(bindings.DB,ctx.clientId.slice('orbit-delegation:'.length)),items:RecordProjection[]=[];
      if(grant.principal_id!==ctx.person.id)throw new ToolRefusal('unauthenticated');
      for(const target of JSON.parse(grant.targets_json) as string[]) {
        const match=/^(companies|contacts|opportunities)\/([^/]+)$/.exec(target);if(!match)continue;
        const kind=({companies:'company',contacts:'contact',opportunities:'opportunity'} as const)[match[1] as 'companies'|'contacts'|'opportunities'];
        if(args.kind&&args.kind!==kind)continue;
        const record=await readRecord(bindings,ctx,kind,match[2]!,args.fields as string[]|undefined);
        if(!args.query||JSON.stringify(record.fields).toLowerCase().includes(String(args.query).toLowerCase()))items.push(record);
      }
      return {items:items.slice(0,Number(args.limit??50)),nextCursor:null,watermark:'selected-native-grant',incomplete:items.length>Number(args.limit??50)};
    }
    const {graph,actor}=await nativeRecords(bindings,ctx);
    return graph.searchRecords(actor,{types:args.kind?[String(args.kind)]:[],query:String(args.query??''),fields:(args.fields??[]) as string[],filters:{},limit:Number(args.limit??50),...(args.cursor?{cursor:String(args.cursor)}:{})});
  };
  return [
    defineTool({name:'orbit.records.list',title:'Find CRM records',description:'Search the current native row and field projection; search never expands a grant.',scope:'records:read',readOnly:true,
      inputSchema:objectSchema({kind:kindSchema,query:{type:'string',maxLength:500},fields:{type:'array',items:string,maxItems:100},limit:{type:'integer',minimum:1,maximum:100},cursor:string},[]),outputSchema,classes:['standard','sensitive'],clauses:['RECORD-001','RECORD-018'],untrusted:true,
      classify:async(args,ctx)=>recordRisk(bindings.DB,(await list(args,ctx)).items),run:async(args,ctx)=>({result:await list(args,ctx)})}),
    defineTool({name:'orbit.records.read',title:'Read a CRM record',description:'Read the current record with native visibility and field grants. Outside text is untrusted.',scope:'records:read',readOnly:true,
      inputSchema:objectSchema({kind:kindSchema,id:string,fields:{type:'array',items:string,maxItems:100}},['kind','id']),outputSchema,classes:['standard','sensitive'],clauses:['RECORD-001','RECORD-018'],untrusted:true,
      classify:async(args,ctx)=>recordRisk(bindings.DB,[await readRecord(bindings,ctx,args.kind as RecordKind,String(args.id),(args.fields??[]) as string[])]),
      run:async(args,ctx)=>({result:await readRecord(bindings,ctx,args.kind as RecordKind,String(args.id),(args.fields??[]) as string[]),resources:[{uri:recordUri(String(args.kind),String(args.id)),name:'CRM record'}]})}),
    defineTool({name:'orbit.records.create',title:'Create a CRM record',description:'Create a native company, contact or opportunity. Deal value is a CRM estimate, never a payment or legal acceptance.',scope:'records:write',readOnly:false,
      inputSchema:objectSchema({kind:kindSchema,record:fieldSchema}),outputSchema,classes:['standard'],clauses:['RECORD-001','RECORD-003','RECORD-007'],classify:async(_args,ctx)=>{await nativeAuthority(bindings.DB,ctx.person.id);return standard();},
      summary:args=>({target:{name:String((args.record as Record<string,unknown>).name??(args.record as Record<string,unknown>).title??'New CRM record')},items:Object.keys(args.record as object)}),
      run:async(args,ctx)=>{
        await nativeAuthority(bindings.DB,ctx.person.id);
        const {access,actor}=await nativeRecords(bindings,ctx),db=agentDatabase(bindings.DB,access,actor,ctx),kind=args.kind as RecordKind;
        const plan=await new RecordsRepository(db).prepareSave(kind,args.record,ctx.person.id,undefined,{ordinaryEdit:true});
        await db.batch(plan.statements);
        const uri=recordUri(kind,plan.id);
        return {result:{id:plan.id,changed:plan.changed},resources:[{uri,name:'Created CRM record'}]};
      }}),
    defineTool({name:'orbit.records.update',title:'Update permitted CRM fields',description:'Edit supported fields at the native graph revision; field grants and recipient restrictions remain authoritative.',scope:'records:write',readOnly:false,
      inputSchema:objectSchema({kind:kindSchema,id:string,fields:fieldSchema}),outputSchema,classes:['standard'],clauses:['RECORD-014','RECORD-018'],
      revision:async(args,ctx)=>(await readRecord(bindings,ctx,args.kind as RecordKind,String(args.id))).ref.revision,
      classify:async(args,ctx)=>{await readRecord(bindings,ctx,args.kind as RecordKind,String(args.id),Object.keys(args.fields as object));return standard();},
      summary:async(args,ctx)=>{const record=await readRecord(bindings,ctx,args.kind as RecordKind,String(args.id));return {target:{id:String(args.id),name:String(record.fields.title??record.fields.name??args.id)},items:Object.entries(args.fields as object).map(([key,value])=>`${key}: ${JSON.stringify(value)}`)};},
      run:async(args,ctx)=>{
        const {access,actor}=await nativeRecords(bindings,ctx),db=agentDatabase(bindings.DB,access,actor,ctx);
        const result=await restrictedEdit(db,actor,args.kind as RecordKind,String(args.id),args.fields,{access,expectedRevision:args.expected_revision as number|undefined});
        const uri=recordUri(String(args.kind),String(args.id));return {result,resources:[{uri,name:'Updated CRM record'}]};
      }}),
  ];
}

export function recordResource(bindings:PlatformBindings):ResourceDefinition {
  return {uriTemplate:'orbit://records/{kind}/{id}',name:'CRM record',scope:'records:read',classes:['standard','sensitive'],
    classify:async record=>recordRisk(bindings.DB,[record.json as RecordProjection]),
    async read(uri,ctx) {
      const match=/^orbit:\/\/records\/(company|contact|opportunity)\/([^/?#]+)$/.exec(uri);if(!match)return null;
      try {return {json:await readRecord(bindings,ctx,match[1] as RecordKind,match[2]!),untrusted:true};}
      catch(error) {if(error instanceof Error && ['AccessError','ToolRefusal'].includes(error.constructor.name))return null;throw error;}
    }};
}
