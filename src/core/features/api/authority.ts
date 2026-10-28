import {salesProfile} from '../teams/policy';
import {systemClock,type Clock} from '../../platform/clock';
import {hash} from '../delegation/protocol';
const nativeFullPredicate="o.status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators x WHERE x.operator_id=o.id)";
import {createId} from '../../shared/ids';

export class ApiError extends Error {
 constructor(readonly status:400|401|403|404|409|413|429|503,message:string){super(message);}
}
export type ApiCredential={id:string;installation_id:string;principal_id:string;operations_json:string;records_json:string;fields_json:string;verifier:string;expires_at:string;revoked_at:string|null;revision:number};
const current=`a.revoked_at IS NULL AND a.expires_at>max(?,strftime('%Y-%m-%dT%H:%M:%fZ','now')) AND EXISTS(SELECT 1 FROM delegation_installation i WHERE i.id=a.installation_id) AND EXISTS(SELECT 1 FROM operators o WHERE o.id=a.principal_id AND ${nativeFullPredicate}) AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import'))`;
const bound=['installation_id','principal_id','operations_json','records_json','fields_json','verifier','expires_at','revision'] as const;

/** Production batches also check database time; injected clocks govern controlled journeys. */
function atClock(sql:string,clock:Clock){return clock===systemClock?sql:sql.replaceAll("max(?,strftime('%Y-%m-%dT%H:%M:%fZ','now'))",'?');}

/** This namespace accepts only installation-local API verifiers, never ambient sessions. */
export async function authenticateApi(db:D1Database,request:Request,clock:Clock){
 const authorization=request.headers.get('Authorization');
 if(!authorization?.match(/^Bearer orbit_api_[a-f0-9]{64}$/))throw new ApiError(401,'An active API credential is required.');
 const row=await db.prepare(atClock(`SELECT a.* FROM api_credentials a WHERE a.verifier=? AND ${current}`,clock)).bind(await hash(authorization.slice(7)),clock.now().toISOString()).first<ApiCredential>();
 if(!row)throw new ApiError(401,'An active API credential is required.');
 return row;
}
export function apiScope(credential:ApiCredential,operation:string,id?:string,fields:string[]=[]){
 if(!JSON.parse(credential.operations_json).includes(operation)||id&&!JSON.parse(credential.records_json).includes(id)||fields.some(field=>!JSON.parse(credential.fields_json).includes(field)))throw new ApiError(403,'The operation, record or fields are outside this credential.');
}
export async function apiTransaction(db:D1Database,credential:ApiCredential,clock:Clock,statements:D1PreparedStatement[]){
 const guard=createId(),profile=await salesProfile(db,credential.principal_id),epoch=profile?await db.prepare('SELECT policy_epoch FROM access_workspaces LIMIT 1').first<number>('policy_epoch'):null;
 try{return await db.batch([
  db.prepare(atClock(`INSERT INTO access_write_guards VALUES(?,CASE WHEN EXISTS(SELECT 1 FROM api_credentials a WHERE a.id=? AND ${current} AND ${bound.map(field=>`a.${field} IS ?`).join(' AND ')}) THEN 1 ELSE 0 END)`,clock)).bind(guard,credential.id,clock.now().toISOString(),...bound.map(field=>credential[field])),
  ...(epoch!==null?[db.prepare('INSERT INTO access_write_guards VALUES(?,CASE WHEN (SELECT policy_epoch FROM access_workspaces LIMIT 1)=? THEN 1 ELSE 0 END)').bind(guard+'-sales',epoch),db.prepare('DELETE FROM access_write_guards WHERE id=?').bind(guard+'-sales')]:[]),
  ...statements,db.prepare('DELETE FROM access_write_guards WHERE id=?').bind(guard),
 ]);}catch(error){
  if(/access_write_guards|allowed=1/.test(String(error)))throw new ApiError(401,'API authority changed; authenticate again.');
  throw error;
 }
}
