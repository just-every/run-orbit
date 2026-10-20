// Test-only native records for repeatable Settings inspection after local runtime cleanup.
import {createDependencies} from '../support/dependencies.ts';
import {createId} from '../../src/core/shared/ids.ts';
export async function prepareSlackVisualData(db,origin){
 const deps=createDependencies(db);
 let owner=await db.prepare("SELECT id FROM operators WHERE setup_owner=1 AND status='active'").first();
 if(!owner){const id=createId();await deps.auth.ensureOperator({id,email:'owner@run-orbit.test',displayName:'Harbour Sales Owner'});await db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(id).run();owner={id};}
 await deps.workspace.ensureWorkspace({name:'Harbour Sales',timezone:'Australia/Brisbane',currency:'USD',workingHours:{days:[1,2,3,4,5],start:'09:00',end:'17:00'},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});
 if(!await db.prepare('SELECT id FROM pipeline_stages LIMIT 1').first())await deps.workspace.ensurePipelineStage({id:createId(),name:'Discovery',position:0});
 await db.prepare("INSERT OR IGNORE INTO slack_installation(id,team_id,bot_user_id,state,error,origin,connected_at,enterprise_id,app_id) VALUES('slack','TVISUAL','UBOT','revoked','token_revoked',?,?,'','AVISUAL')").bind(origin,new Date().toISOString()).run();
}
