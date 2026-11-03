import {Hono} from 'hono';
import type {ActorContext} from '../../shared/expansion-contracts';
import {legacyDatabase} from './legacy-database';
import {createDependencies} from '../../app/dependencies';
import {PipelinesRepository} from '../pipelines/repository';
import {buildBrief} from '../today/brief';

/** Only the workspace's read views, using the same current record and field projection as SSR. */
export function collaboratorWorkspaceReads(db:D1Database,actor:ActorContext,operatorId:string){
 const scoped=legacyDatabase(db,actor),app=new Hono(),deps=createDependencies(scoped);
 app.onError(error=>{throw error;});
 app.route('/opportunities',deps.opportunityRoutes);
 app.route('/workspace',deps.workspaceRoutes);
 app.get('/settings',async c=>{
  const [workspace,pipelines,operators]=await Promise.all([
   scoped.prepare("SELECT name,timezone,currency FROM workspace_settings WHERE id='workspace'").first(),
   new PipelinesRepository(scoped).read(),
   scoped.prepare("SELECT id,display_name,status FROM operators WHERE status='active'").all(),
  ]);
  return c.json({workspace,...pipelines,operators:operators.results});
 });
 app.get('/today',async c=>c.json({brief:await buildBrief(scoped,{operatorId,visible:{record:()=>true,signal:()=>false}}),aiConfigured:false}));
 return app;
}
export const workspaceReadPath=(path:string)=>/^\/api\/v1\/(?:opportunities\/(?:now|[0-9A-HJKMNP-TV-Z]{26})|workspace\/presentation|settings|today\/?)$/.test(path);
