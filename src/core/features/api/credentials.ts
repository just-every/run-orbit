import type {AuthenticatedOperator} from '../identity';
import {AccessService} from '../access/service';
import {AccessError} from '../access/errors';
import {z} from 'zod';
import type {Clock} from '../../platform/clock';
import {systemClock} from '../../platform/clock';
import {createId} from '../../shared/ids';
import {hash,random} from '../delegation/protocol';
import {audit,RecordError} from '../records/shared';

export const dealReadFields=['title','stage_id','value_cents','company_id','expected_close_at','owner_id','products'] as const;
const recordId=z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
export const credentialDefinition=z.object({
 name:z.string().trim().min(1).max(100),
 principalId:recordId,
 operations:z.array(z.enum(['deal.read','deal.create','deal.update'])).min(1).max(3),
 recordIds:z.array(recordId).min(1).max(100),
 fields:z.array(z.enum(dealReadFields)).min(1).max(dealReadFields.length),
 expiresAt:z.iso.datetime(),
}).strict();
type Definition=z.infer<typeof credentialDefinition>;
type Credential={id:string;installation_id:string;name:string;principal_id:string;operations_json:string;records_json:string;fields_json:string;verifier:string;created_at:string;expires_at:string;revoked_at:string|null;revision:number};
const administrator="EXISTS(SELECT 1 FROM operators o WHERE o.id=? AND o.status='active' AND o.setup_owner=1 AND NOT EXISTS(SELECT 1 FROM access_collaborators c WHERE c.operator_id=o.id))";
const principal="EXISTS(SELECT 1 FROM operators o WHERE o.id=? AND o.status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators c WHERE c.operator_id=o.id))";
const available="NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import')";
const fullScope="NOT EXISTS(SELECT 1 FROM json_each(?) r WHERE NOT EXISTS(SELECT 1 FROM opportunities d WHERE d.id=r.value))";
const projection=(row:Credential)=>({id:row.id,name:row.name,principalId:row.principal_id,operations:JSON.parse(row.operations_json) as string[],recordIds:JSON.parse(row.records_json) as string[],fields:JSON.parse(row.fields_json) as string[],createdAt:row.created_at,expiresAt:row.expires_at,revokedAt:row.revoked_at,revision:row.revision});

export class ApiCredentials {
 constructor(readonly db:D1Database,readonly clock:Clock=systemClock){}
 async requireAdministrator(actor:string){
  const row=await this.db.prepare(`SELECT ${administrator} AND ${available} AS allowed`).bind(actor).first<{allowed:number}>();
  if(!row?.allowed)throw new RecordError(403,'An active installation administrator is required outside archive restore.');
 }
 async list(actor:string){await this.requireAdministrator(actor);return(await this.db.prepare(`SELECT * FROM api_credentials WHERE ${administrator} AND ${available} ORDER BY created_at,id`).bind(actor).all<Credential>()).results.map(projection);}
 private async commit(actor:AuthenticatedOperator,condition:string,args:(string|number)[],statements:D1PreparedStatement[]){
  const guard=createId();
  try{const access=new AccessService(this.db),context=await access.authorizeLegacy(actor,createId(),'legacy.write');await this.db.batch([
   ...access.fence(context).map(statement=>this.db.prepare(statement.sql).bind(...statement.bindings)),
   this.db.prepare(`INSERT INTO access_write_guards VALUES(?,CASE WHEN ${administrator} AND ${available} AND (${condition}) THEN 1 ELSE 0 END)`).bind(guard,actor.operatorId,...args),
   ...statements,this.db.prepare('DELETE FROM access_write_guards WHERE id=?').bind(guard),
  ]);}catch(error){
   if(error instanceof AccessError)throw new RecordError(403,error.message);
   if(String(error).includes('access_write_guards')||String(error).includes('allowed=1'))throw new RecordError(409,'Credential authority or review changed; review it again.');
   throw error;
  }
 }
 async issue(actor:AuthenticatedOperator,input:Definition){
  await this.requireAdministrator(actor.operatorId);
  const now=this.clock.now(),expires=new Date(input.expiresAt),records=JSON.stringify([...new Set(input.recordIds)].sort());
  if(expires<=now||expires.getTime()-now.getTime()>90*86400000)throw new RecordError(400,'Choose a future expiry within 90 days.');
  const installation=await this.db.prepare('SELECT id FROM delegation_installation').first<{id:string}>();
  if(!installation)throw new RecordError(409,'The installation identity is unavailable.');
  const id=createId(),secret='orbit_api_'+random(),verifier=await hash(secret);
  await this.commit(actor,`${principal} AND ${fullScope} AND EXISTS(SELECT 1 FROM delegation_installation WHERE id=?)`,[input.principalId,records,installation.id],[
   this.db.prepare('INSERT INTO api_credentials(id,installation_id,name,principal_id,operations_json,records_json,fields_json,verifier,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,installation.id,input.name,input.principalId,JSON.stringify([...new Set(input.operations)].sort()),records,JSON.stringify([...new Set(input.fields)].sort()),verifier,now.toISOString(),expires.toISOString()),
   audit(this.db,actor.operatorId,'api.credential_issued','api_credential',id),
  ]);
  return {credential:(await this.list(actor.operatorId)).find(row=>row.id===id)!,secret};
 }
 async rotate(actor:AuthenticatedOperator,id:string,revision:number){
  await this.requireAdministrator(actor.operatorId);
  const row=await this.db.prepare('SELECT * FROM api_credentials WHERE id=?').bind(id).first<Credential>();
  if(!row)throw new RecordError(404,'Credential not found.');
  const now=this.clock.now().toISOString();
  if(row.revoked_at||row.expires_at<=now)throw new RecordError(409,'A revoked or expired credential cannot be restored.');
  const secret='orbit_api_'+random();
  await this.commit(actor,`EXISTS(SELECT 1 FROM api_credentials WHERE id=? AND revision=? AND revoked_at IS NULL AND expires_at>? AND installation_id IN(SELECT id FROM delegation_installation)) AND ${principal} AND ${fullScope}`,[id,revision,now,row.principal_id,row.records_json],[
   this.db.prepare('UPDATE api_credentials SET verifier=?,revision=revision+1 WHERE id=?').bind(await hash(secret),id),
   audit(this.db,actor.operatorId,'api.credential_rotated','api_credential',id),
  ]);
  return {credential:(await this.list(actor.operatorId)).find(candidate=>candidate.id===id)!,secret};
 }
 async revoke(actor:AuthenticatedOperator,id:string,revision:number){
  await this.requireAdministrator(actor.operatorId);
  await this.commit(actor,'EXISTS(SELECT 1 FROM api_credentials WHERE id=? AND revision=?)',[id,revision],[
   this.db.prepare('UPDATE api_credentials SET revoked_at=COALESCE(revoked_at,?),revision=revision+1,verifier=? WHERE id=?').bind(this.clock.now().toISOString(),await hash(random()),id),
   audit(this.db,actor.operatorId,'api.credential_revoked','api_credential',id),
  ]);
  return {revoked:true};
 }
}
