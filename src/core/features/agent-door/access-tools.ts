import { z } from 'zod';
import type { ToolContext, ToolDefinition } from '../../../base/modules/agent-door/types.ts';
import { AccessService } from '../access/service';
import { AccessAdministration } from '../access/administration';
import { domainEventStatements } from '../effects/event-statements';
import { ApiCredentials } from '../api/credentials';
import { agentDatabase, full, machineActor } from './native';
import { define, id, standard } from './tools';
import { ToolRefusal } from '../../../base/modules/agent-door/index.ts';
export async function administration(c:ToolContext,write=false){
 const db=write?await agentDatabase(c):c.db,access=new AccessService(db),actor=await access.resolveAgentContext(c.person.id,c.agent.id,crypto.randomUUID());
 return{db,actor,admin:new AccessAdministration(db,access,domainEventStatements)};
}
const grantSchema=z.object({subjectId:id,resourceType:z.enum(['contact','company','opportunity','analytics','legacy']),resourceId:id,actions:z.array(z.string()).min(1).max(10),fields:z.array(z.string()).max(100),purpose:z.string().min(1).max(1000),expiresAt:z.iso.datetime().nullable()});
export function accessTools():ToolDefinition[]{return [
 define('access','grants',z.object({id}),{description:'Read the effective native actions and fields of one record grant, for a revocation readback.',readOnly:true,classes:['standard'],clauses:['TEAM-001'],async run(a,c){await full(c);const row=await c.db.prepare('SELECT actions_json,fields_json,revoked_at,expires_at FROM access_grants WHERE id=?').bind(a.id).first<{actions_json:string;fields_json:string;revoked_at:string|null;expires_at:string|null}>();if(!row)throw new ToolRefusal('not_found');return{grants:row.revoked_at||row.expires_at&&Date.parse(row.expires_at)<=Date.now()?[]:[...new Set([...JSON.parse(row.actions_json),...JSON.parse(row.fields_json).map((field:string)=>'field:'+field)])]};}}),
 define('credentials','read',z.object({id}),{description:'Read redacted native credential metadata and its effective grants as installation administrator.',readOnly:true,classes:['standard'],clauses:['API-001'],async run(a,c){const row=(await new ApiCredentials(c.db).list(c.person.id)).find(row=>row.id===a.id);if(!row)throw new ToolRefusal('not_found');return{credential:row,grants:row.revokedAt||Date.parse(row.expiresAt)<=Date.now()?[]:[...new Set([...row.operations,...row.fields.map(f=>'field:'+f),...row.recordIds.map(id=>'record:'+id)])]};}}),

 define('access','read',z.object({}),{description:'Read current native access grants and member roles; never reveal invitation tokens or credentials.',readOnly:true,classes:['standard'],clauses:['TEAM-001','TEAM-002'],
 async run(_a,c){await full(c);const {admin,actor}=await administration(c);return admin.describe(actor);}}),
 define('access','update',grantSchema,{description:'Grant an accepted native collaborator the exact supported record/field authority. Self widening refuses under every policy.',readOnly:false,classes:['access'],clauses:['TEAM-001','RECORD-017'],
 async authority(a,c){await full(c);return{subject:String(a.subjectId),widens:true};},
 classify:()=>[{class:'access',facts:{measure:1,direction:'widens'}}],
 async summary(a,c){await full(c);return{target:{id:a.subjectId},items:[a.resourceType,a.resourceId,...a.actions,...a.fields,a.purpose]};},
 async run(a,c){const {admin,actor}=await administration(c,true),result=await admin.grant(actor,{...a,subjectKind:'operator'});c.emit('access.changed',`orbit://access/${a.subjectId}`);return result;}}),
 define('access','revoke',z.object({id}),{description:'Revoke one native record grant. This tool can only reduce authority.',readOnly:false,classes:['access'],clauses:['TEAM-001','RECORD-017'],widens:false,narrowing:{effect:'revoke',target:'id'},
 async authority(a,c){await full(c);const row=await c.db.prepare('SELECT subject_id FROM access_grants WHERE id=?').bind(a.id).first<{subject_id:string}>();if(!row)throw new ToolRefusal('not_found');return{subject:row.subject_id,widens:false};},
 classify:()=>[{class:'access',facts:{measure:1,direction:'narrows'}}],
 async summary(a,c){await full(c);return{target:{id:a.id},items:['Revoke native record grant']};},
 async run(a,c){const {admin,actor}=await administration(c,true);await admin.revokeGrant(actor,a.id);return{revoked:true};}}),
 define('credentials','revoke',z.object({id}),{description:'Revoke an installation-local API credential as its native installation administrator. No bearer secret is returned.',readOnly:false,classes:['security'],clauses:['API-001'],widens:false,narrowing:{effect:'revoke',target:'id'},
 async authority(a,c){if(c.person.role!=='owner')throw new ToolRefusal('native_permission');const r=await c.db.prepare('SELECT principal_id FROM api_credentials WHERE id=?').bind(a.id).first<{principal_id:string}>();if(!r)throw new ToolRefusal('not_found');return{subject:r.principal_id,widens:false};},
 classify:()=>[{class:'security',facts:{measure:1,setting:'api_credential'}}],
 async summary(a,c){await full(c);return{target:{id:a.id},items:['Permanently revoke API credential']};},
 async run(a,c){const credentials=new ApiCredentials(await agentDatabase(c)),row=(await credentials.list(c.person.id)).find(row=>row.id===a.id);if(!row)throw new ToolRefusal('not_found');return credentials.revoke(machineActor(c),a.id,row.revision);}})
];}
