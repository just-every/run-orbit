import {AccessService} from '../access/service';
import {ManualRepository} from '../records/manual';
import {DataRepository} from '../records/data';
import {salesProfile} from './policy';
import {salesOperationAllowed} from './permissions';
import {salesCanRead} from './record-access';
import {deny} from '../access/errors';
import type {AuthenticatedOperator} from '../identity';
import type {RecordKind} from '../records/shared';
/** A native mutation's batch carries the exact role epoch and live native session. */
export function salesWriteDatabase(db:D1Database,access:AccessService,actor:Awaited<ReturnType<AccessService['resolveOperatorContext']>>):D1Database{return new Proxy(db,{get(target,key){if(key==='batch')return async(statements:D1PreparedStatement[])=>{const checks=access.fence(actor).map(item=>target.prepare(item.sql).bind(...item.bindings));return(await target.batch([...checks,...statements])).slice(checks.length);};const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}});}
export async function salesMutationResponse(db:D1Database,operator:AuthenticatedOperator,request:Request){
 const path=new URL(request.url).pathname,match=/^\/api\/v1\/records\/(contact|company|opportunity)\/([0-9A-HJKMNP-TV-Z]{26})(?:\/entries(?:\/([0-9A-HJKMNP-TV-Z]{26}))?)?$/.exec(path);
 if(!match||!['POST','PUT','DELETE'].includes(request.method))return null;
 // Ordinary field updates have their existing independently fenced boundary.
 if(request.method==='PUT'&&!path.includes('/entries'))return null;
 const profile=await salesProfile(db,operator.operatorId);if(!profile)return null;
 const access=new AccessService(db),scope=await access.originalWorkspace(),actor=await access.resolveOperatorContext(operator,scope.workspaceId,crypto.randomUUID()),kind=match[1] as RecordKind,id=match[2],entry=match[3];
 await access.authorize(actor,'graph.update',{...actor,type:kind,id},path.includes('/entries')?['notes']:[]);
 const fenced=salesWriteDatabase(db,access,actor);
 if(!path.includes('/entries')){if(request.method!=='DELETE')return null;if(!salesOperationAllowed(profile,'record.delete'))deny('Delete permission is required.');const input=await request.json() as {confirmed?:boolean};if(input.confirmed!==true)return Response.json({error:'Confirm record deletion.'},{status:400});return Response.json(await new DataRepository(fenced).remove(kind,id,operator.operatorId,operator.sessionId));}
 if(request.method==='DELETE'){if(!entry)return null;return Response.json(await new ManualRepository(fenced).remove(kind,id,entry,operator.operatorId));}
 const input=await request.json() as {kind:'note'|'call'|'meeting';text:string;occurredAt:string;durationMinutes?:number;contactIds?:string[]};
 if(!['note','call','meeting'].includes(input.kind)||typeof input.text!=='string'||typeof input.occurredAt!=='string')return Response.json({error:'Enter a valid manual entry.'},{status:400});
 for(const contact of input.contactIds??[])if(!await salesCanRead(db,operator.operatorId,'contact',contact))deny('A related contact is outside your access.');
 return Response.json(await new ManualRepository(fenced).save(kind,id,input,operator.operatorId,entry));
}
