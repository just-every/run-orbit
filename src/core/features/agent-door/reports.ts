import {defineTool,type ToolContext,type ResourceDefinition} from '../../../base/modules/agent-door/index.ts';
import {AnalyticsMetrics,metricDefinition} from '../analytics/metrics';
import {NativeAnalyticsSources} from '../analytics/native-sources';
import {OperationsStore} from '../operations/store';
import {domainEventStatements} from '../effects/event-statements';
import {ForecastRepository} from '../forecast/repository';
import {dealForecastSchema} from '../forecast/schema';
import {salesDefinition} from '../analytics/sales-definition';
import {z} from 'zod';
import type {PlatformBindings} from '../../platform/assets';
import {nativeRecords,objectSchema,outputSchema,standard,string} from './records';
import {fullSeller} from './evidence';
import {agentDatabase} from './native-access';

async function nativeReports(bindings:PlatformBindings,ctx:ToolContext) {
  await fullSeller(bindings,ctx);const {access,actor}=await nativeRecords(bindings,ctx),db=agentDatabase(bindings.DB,access,actor,ctx);
  return {actor,metrics:new AnalyticsMetrics(new OperationsStore(db,access,domainEventStatements),new NativeAnalyticsSources(access)),forecast:new ForecastRepository(db,access)};
}
export function reportTools(bindings:PlatformBindings) {
  const metricSchema=z.toJSONSchema(metricDefinition);
  // JSON object keys are already strings. Base's closed schema vocabulary does
  // not admit Zod's redundant propertyNames:{type:'string'} annotation.
  delete (metricSchema.properties!.filters as Record<string,unknown>).propertyNames;
  return [
    defineTool({name:'orbit.reports.read',title:'Read native report evidence',description:'Read a saved native report snapshot with its exact source dependencies and measurement limits. It never delivers a report.',scope:'reports:read',readOnly:true,
      inputSchema:objectSchema({id:string}),outputSchema,classes:['standard'],clauses:['REPORT-001'],untrusted:true,classify:async(_args,ctx)=>{await fullSeller(bindings,ctx);return standard();},
      run:async(args,ctx)=>{const {actor,metrics}=await nativeReports(bindings,ctx);return {result:await metrics.read(actor,String(args.id))};}}),
    defineTool({name:'orbit.reports.update',title:'Save a native metric definition',description:'Save a versioned private metric definition using the native source validator. No provider or report-delivery schedule is created.',scope:'reports:write',readOnly:false,
      inputSchema:objectSchema({id:string,version:{type:'integer',minimum:1},definition:{anyOf:[metricSchema,z.toJSONSchema(salesDefinition)]}},['definition']),outputSchema,classes:['standard'],clauses:['REPORT-001'],
      classify:async(_args,ctx)=>{await fullSeller(bindings,ctx);return standard();},summary:args=>({target:{id:String(args.id),name:String((args.definition as {name:string}).name)},items:[`Version: ${args.version}`,JSON.stringify(args.definition)]}),
      run:async(args,ctx)=>{const {actor,metrics}=await nativeReports(bindings,ctx);const id=args.id?String(args.id):crypto.randomUUID(),version=Number(args.version??1);const result=await metrics.define(actor,id,version,args.definition);ctx.emit('report.updated',`orbit://reports/${id}/definition/${version}`);return {result};}}),
    defineTool({name:'orbit.reports.preview',title:'Preview native report measurement',description:'Read the current native report measurement and its source-bound review hash without saving a snapshot.',scope:'reports:read',readOnly:true,
      inputSchema:objectSchema({id:string,version:{type:'integer',minimum:1},from:{type:'string',format:'date-time'},through:{type:'string',format:'date-time'}}),outputSchema,classes:['standard'],clauses:['REPORT-001'],
      classify:async(_args,ctx)=>{await fullSeller(bindings,ctx);return standard();},
      run:async(args,ctx)=>{const {actor,metrics}=await nativeReports(bindings,ctx);return {result:await metrics.preview(actor,String(args.id),Number(args.version),String(args.from),String(args.through))};}}),
    defineTool({name:'orbit.reports.compute',title:'Save a source-bound report snapshot',description:'Compute and save the native measurement only when its exact preview hash is still current. No external delivery is started.',scope:'reports:write',readOnly:false,
      inputSchema:objectSchema({id:string,version:{type:'integer',minimum:1},from:{type:'string',format:'date-time'},through:{type:'string',format:'date-time'},review_hash:{type:'string',pattern:'^[a-f0-9]{64}$'}}),outputSchema,classes:['standard'],clauses:['REPORT-001'],
      classify:async(_args,ctx)=>{await fullSeller(bindings,ctx);return standard();},summary:args=>({target:{id:String(args.id)},items:[`Version: ${args.version}`,`From: ${args.from}`,`Through: ${args.through}`,`Native review: ${args.review_hash}`]}),
      run:async(args,ctx)=>{const {actor,metrics}=await nativeReports(bindings,ctx);const result=await metrics.compute(actor,String(args.id),Number(args.version),String(args.from),String(args.through),undefined,String(args.review_hash));const id=result.id;ctx.emit('report.computed',`orbit://reports/${id}`);return {result,resources:[{uri:`orbit://reports/${id}`,name:'Native report snapshot'}]};}}),
    defineTool({name:'orbit.forecasts.read',title:'Read current forecast facts',description:'Read native CRM estimates, observed reviews and independent snapshot history. Estimates do not move money or bind a contract.',scope:'forecasts:read',readOnly:true,
      inputSchema:objectSchema({id:string},[]),outputSchema,classes:['standard'],clauses:['FORECAST-001'],untrusted:true,classify:async(_args,ctx)=>{await fullSeller(bindings,ctx);return standard();},
      run:async(args,ctx)=>{const {actor,forecast}=await nativeReports(bindings,ctx);return {result:args.id&&args.id!=='current'?await forecast.snapshot(actor,String(args.id)):await forecast.read(actor)};}}),
    defineTool({name:'orbit.forecasts.update',title:'Record a reasoned deal forecast',description:'Save a native forecast override with its required reason. Current native owner authority remains required; a forecast is CRM data.',scope:'forecasts:write',readOnly:false,
      inputSchema:objectSchema({id:string,forecast:z.toJSONSchema(dealForecastSchema)}),outputSchema,classes:['standard'],clauses:['FORECAST-001'],
      revision:async(_args,ctx)=>{await fullSeller(bindings,ctx);return (await bindings.DB.prepare('SELECT revision FROM forecast_source_clock WHERE id=1').first<{revision:number}>())!.revision;},
      classify:async(_args,ctx)=>{await fullSeller(bindings,ctx);return standard();},summary:args=>({target:{id:String(args.id)},items:[JSON.stringify(args.forecast)]}),
      run:async(args,ctx)=>{const {actor,forecast}=await nativeReports(bindings,ctx);const result=await forecast.setDeal(actor,String(args.id),dealForecastSchema.parse(args.forecast));ctx.emit('forecast.updated','orbit://forecasts/current');return {result};}}),
  ];
}
export function reportResources(bindings:PlatformBindings):ResourceDefinition[] {
  return [
    {uriTemplate:'orbit://reports/{id}',name:'Native report snapshot',scope:'reports:read',tool:'orbit.reports.read'},
    {uriTemplate:'orbit://reports/{id}/definition/{version}',name:'Native report definition',scope:'reports:read',tool:'orbit.reports.read'},
    {uriTemplate:'orbit://forecasts/{id}',name:'Immutable forecast snapshot',scope:'forecasts:read',tool:'orbit.forecasts.read'},
  ].map(({uriTemplate,name,scope,tool})=>({uriTemplate,name,scope,classes:['standard'],classify:standard,
    async read(uri,ctx) {try {await fullSeller(bindings,ctx);const id=uri.split('/').at(-1)!;const definition=reportTools(bindings).find(item=>item.name===tool)!;
      const principal={...ctx,seed:'orbit',origin:bindings.AUTH_ORIGIN!,now:Date.now,door:'mcp' as const,actor:{agent:ctx.agent,for:{id:ctx.person.id,name:ctx.person.name},label:`${ctx.agent.name} for ${ctx.person.name}`},approvers:[],emit(){}};
      const definitionUri=/^orbit:\/\/reports\/([^/?#]+)\/definition\/(\d+)$/.exec(uri);
      if(definitionUri) {
        const {actor,metrics}=await nativeReports(bindings,principal);await metrics.permit(actor,'analytics.read',definitionUri[1]);await metrics.sales.shares.assertVisible(actor,definitionUri[1]!);
        const row=await bindings.DB.prepare('SELECT body_json FROM analytics_definitions WHERE workspace_id=? AND id=? AND version=?').bind(actor.workspaceId,definitionUri[1],Number(definitionUri[2])).first<{body_json:string}>();
        await metrics.checkSources(actor,[]);return row?{json:JSON.parse(row.body_json),untrusted:true}:null;
      }
      const result=await definition.run({id},principal);
      return {json:result.result,untrusted:true};}catch{return null;}}}));
}
