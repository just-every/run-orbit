import {Hono} from 'hono';
import type {AuthenticatedOperator} from '../identity';
import {AccessService} from '../access/service';
import {legacyDatabase} from '../access/legacy-database';
import {createDependencies} from '../../app/dependencies';
import {createWorkbenchRoutes} from '../workbench/routes';
import {createTodayRoutes} from '../today/routes';
import {SettingsRepository} from '../settings/repository';
/** Native sales pages read from the same current row and field projection as search and reports. */
export async function salesReadResponse(db:D1Database,operator:AuthenticatedOperator,request:Request){
 const path=new URL(request.url).pathname;
 if(request.method!=='GET')return null;
 if(path==='/api/v1/settings'){
  const settings=await new SettingsRepository(db).read();return Response.json({...settings,operators:settings.operators.map((person:any)=>({id:person.id,display_name:person.display_name,status:person.status,collaborator:person.collaborator})),owner:null,local:false});
 }
 if(path.startsWith('/api/v1/workbench')&&!['/api/v1/workbench','/api/v1/workbench/','/api/v1/workbench/onboarding'].includes(path))return null;
 const mount=path.startsWith('/api/v1/opportunities')?'/api/v1/opportunities':path.startsWith('/api/v1/workbench')?'/api/v1/workbench':path.startsWith('/api/v1/today')?'/api/v1/today':path==='/api/v1/workspace/presentation'?'/api/v1/workspace':null;if(!mount)return null;
 const access=new AccessService(db),scope=await access.originalWorkspace(),actor=await access.resolveOperatorContext(operator,scope.workspaceId,crypto.randomUUID()),scoped=legacyDatabase(db,actor),dependencies=createDependencies(scoped);
 const child=mount==='/api/v1/opportunities'?dependencies.opportunityRoutes:mount==='/api/v1/workbench'?createWorkbenchRoutes(scoped):mount==='/api/v1/today'?createTodayRoutes(scoped):dependencies.workspaceRoutes;
 const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>();app.use('*',async(c,next)=>{c.set('operator',operator);await next();});app.route('/',child as Hono<any>);const url=new URL(request.url);url.pathname=path.slice(mount.length)||'/';return app.fetch(new Request(url,request));
}
