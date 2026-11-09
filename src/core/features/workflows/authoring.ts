import {z} from 'zod';
import {createId} from '../../shared/ids';
import {definition,WorkflowError} from './contracts';
import {owner,authorityFence,currentVersion,versionFence,workflowAudit} from './repository';
import {validateDefinition} from './planning';

export const draftInput=z.object({name:z.string().trim().min(1).max(100),definition}).strict();

/** Save only a draft. Activation and running authority stay with the native
 * preview and activation doors. MCP supplies the exact source version. */
export async function saveWorkflowDraft(db:D1Database,actor:string,input:unknown,at:string,id?:string,sourceVersion?:number){
 const authority=await owner(db,actor),body=draftInput.parse(input);
 await validateDefinition(db,actor,body.definition);
 let next=1;
 if(id){const current=await currentVersion(db,id);if(sourceVersion!==undefined&&current.version!==sourceVersion)throw new WorkflowError(409,'Workflow version changed. Read the current workflow and retry.');next=current.version+1;}
 else id=createId();
 await db.batch([authorityFence(db,actor,authority.version),...(sourceVersion===undefined?[]:[versionFence(db,id,sourceVersion)]),
  db.prepare("INSERT INTO workflow_versions(workflow_id,version,name,definition_json,status,created_by,created_at) VALUES(?,?,?,?,'draft',?,?)").bind(id,next,body.name,JSON.stringify(body.definition),actor,at),
  workflowAudit(db,actor,'draft_saved',id,{version:next},at)]);
 return {workflow:{id,name:body.name,version:next,status:'draft',definition:body.definition}};
}
