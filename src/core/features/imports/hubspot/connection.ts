import type {AuthenticatedOperator} from '../../identity';
import {importAuthority} from '../repository';
import {createId} from '../../../shared/ids';
import {hubspotRead,HubSpotError,readScopes,type HubSpotConfig} from './provider';
export interface Connection {id:string;portal_id:string;secret_ciphertext:string|null;state:string;reason:string|null}
export async function owner(db:D1Database,actor:AuthenticatedOperator){const p=importAuthority(actor);if(!await db.prepare(`SELECT 1 FROM operators WHERE id=? AND setup_owner=1 AND (${p.sql})`).bind(actor.operatorId,...p.params!).first())throw new HubSpotError(403,'Only the current installation owner connects and imports HubSpot.');}
export async function connection(db:D1Database){return db.prepare("SELECT * FROM crm_import_hubspot_connection WHERE singleton=1").first<Connection>();}
export async function connectionView(db:D1Database){const row=await connection(db);return{state:row?.secret_ciphertext?row.state:'unresolved-setup',reason:row?.reason??(row?.secret_ciphertext?null:'HubSpot is paused until this installation owner connects a read-only private app. Restored installations must connect again.'),portalId:row?.portal_id??null};}
export async function connect(db:D1Database,config:HubSpotConfig,actor:AuthenticatedOperator,token:string){
 await owner(db,actor);if(!config.security)throw new HubSpotError(503,'HubSpot needs the installation encryption key.');
 // Clear prior authorization before a new check; a refused replacement never leaves a connected badge.
 await db.prepare("DELETE FROM crm_import_hubspot_connection").run();
 try{const info=await hubspotRead(config,token,'/oauth/v2/private-apps/get/access-token-info',{tokenKey:token}),scopes=info.scopes;
  if(!Array.isArray(scopes)||scopes.some((s:any)=>typeof s!=='string'||!s.endsWith('.read'))||readScopes.some(s=>!scopes.includes(s)))throw new HubSpotError(400,`Use a least-privilege read-only private app with ${readScopes.join(', ')}. Remove write permissions; grant any object read scope named by a refused pull.`);
  const portal=String(info.hubId??'');if(!/^\d{1,30}$/.test(portal))throw new HubSpotError(409,'HubSpot did not identify its account. Check the private app token.');
  await owner(db,actor);const p=importAuthority(actor);
  await db.prepare(`INSERT INTO crm_import_hubspot_connection(singleton,id,portal_id,secret_ciphertext,state,reason) SELECT 1,?,?,?,'connected',NULL WHERE (${p.sql}) AND EXISTS(SELECT 1 FROM operators WHERE id=? AND setup_owner=1)`).bind(createId(),portal,await config.security.seal(token),...p.params!,actor.operatorId).run();
 }catch(error){if(error instanceof HubSpotError){await db.prepare("INSERT INTO crm_import_hubspot_connection(singleton,id,portal_id,state,reason) VALUES(1,?,'','unresolved-setup',?)").bind(createId(),error.message).run();}throw error;}
 return connectionView(db);
}
export async function openConnection(db:D1Database,config:HubSpotConfig,actor:AuthenticatedOperator){
 await owner(db,actor);const row=await connection(db);if(!row?.secret_ciphertext||row.state!=='connected'||!config.security)throw new HubSpotError(409,'HubSpot is unresolved setup. Connect its read-only private app again in Settings.');
 try{return{row,token:await config.security.open(row.secret_ciphertext)};}catch{throw new HubSpotError(409,'The HubSpot token cannot be opened in this installation. Connect again.');}
}
export async function refuseConnection(db:D1Database,error:HubSpotError){if(error.status===409)await db.prepare("UPDATE crm_import_hubspot_connection SET state='unresolved-setup',reason=?").bind(error.message).run();}
