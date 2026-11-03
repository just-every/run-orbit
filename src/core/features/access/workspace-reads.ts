import {Hono} from 'hono';
import type {ActorContext} from '../../shared/expansion-contracts';
import {legacyDatabase} from './legacy-database';
import {createDependencies} from '../../app/dependencies';
import {PipelinesRepository} from '../pipelines/repository';
import {buildBrief} from '../today/brief';
import {operatorListingPredicate} from '../identity/operator-listing';

/** Only the workspace's read views, using the same current record and field projection as SSR. */
export function collaboratorWorkspaceReads(db:D1Database,actor:ActorContext,operatorId:string){
 const scoped=legacyDatabase(db,actor),app=new Hono(),deps=createDependencies(scoped);
 app.onError(error=>{throw error;});
 app.route('/opportunities',deps.opportunityRoutes);
 app.route('/workspace',deps.workspaceRoutes);
 app.get('/settings',async c=>{
  const [workspace,pipelines,owners]=await Promise.all([
   scoped.prepare("SELECT name,timezone,currency FROM workspace_settings WHERE id='workspace'").first(),
   new PipelinesRepository(scoped).read(),
   scoped.prepare('SELECT DISTINCT owner_id FROM opportunities WHERE owner_id IS NOT NULL').all<{owner_id:string}>(),
  ]);
  return c.json({workspace,...pipelines,operators:await dealOwners(db,owners.results.map(row=>row.owner_id))});
 });
 app.get('/today',async c=>c.json({brief:await buildBrief(scoped,{operatorId,visible:{record:()=>true,signal:()=>false}}),aiConfigured:false}));
 return app;
}
/** A collaborator's people are the owners of the deals they read (the names their NOW and deal reads already show),
 * listed as Orbit lists people everywhere: active full operators, the reserved dev seller only after a real sign-in.
 * Other collaborators, such as an accepted Guest named by their email, never appear. The ids come from the fenced
 * scoped read above; only their names are read here, with the same listing predicate the owner's own list uses. */
async function dealOwners(db:D1Database,ids:string[]){
 return (await db.prepare(`SELECT id,display_name,status FROM operators WHERE status='active' AND id IN(SELECT value FROM json_each(?)) AND NOT EXISTS(SELECT 1 FROM access_collaborators x WHERE x.operator_id=operators.id) AND ${operatorListingPredicate('operators')} ORDER BY created_at,id`).bind(JSON.stringify(ids)).all<{id:string;display_name:string;status:string}>()).results;
}
export const workspaceReadPath=(path:string)=>/^\/api\/v1\/(?:opportunities\/(?:now|[0-9A-HJKMNP-TV-Z]{26})|workspace\/presentation|settings|today\/?)$/.test(path);
