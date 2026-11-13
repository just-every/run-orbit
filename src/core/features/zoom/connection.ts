import {audit} from '../records/shared';
import {ZoomError,zoomSource,type ZoomConfig,type ZoomCredentials} from './contracts';
import {zoomToken} from './provider';
interface SourceRow {type:string;enabled:number;secret_ciphertext:string|null;last_error:string|null;last_accepted_at:string|null;cursor:string|null}
export const sourceRow=(db:D1Database)=>db.prepare('SELECT type,enabled,secret_ciphertext,last_error,last_accepted_at,cursor FROM signal_sources WHERE id=?').bind(zoomSource).first<SourceRow>();
export async function connection(db:D1Database){
 const row=await sourceRow(db),held=Boolean(row?.type==='mail_provider'&&row.secret_ciphertext),reason=!row?'Connect the owner’s Zoom Server-to-Server OAuth app.':!held?'Zoom is paused. Connect credentials in this installation; secrets never travel in an archive.':!row.enabled?(row.last_error??'Zoom is paused. Reconnect in Settings.'):null;
 return {state:reason?'unresolved-setup' as const:'connected' as const,reason,held,lastEventAt:row?.last_accepted_at??null};
}
export async function connect(db:D1Database,config:ZoomConfig,credentials:ZoomCredentials,actor:string){
 if(!config.security)throw new ZoomError(503,'Zoom needs the installation encryption key.');
 const row=await sourceRow(db);if(row&&row.type!=='mail_provider')throw new ZoomError(409,'A different signal source already uses the Zoom identity.');
 let auth;try{auth=await zoomToken(config,credentials);}catch(error){
  if(error instanceof ZoomError&&error.status===403)await db.batch([db.prepare('UPDATE signal_sources SET enabled=0,last_error=? WHERE id=?').bind(error.message,zoomSource),audit(db,actor,'zoom.connection-refused','zoom',zoomSource)]);
  throw error;
 }
 const at=(config.now?.()??new Date()).toISOString();
 await db.batch([db.prepare("INSERT INTO signal_sources(id,name,type,enabled,created_at,updated_at,secret_ciphertext,cursor) VALUES(?,'Zoom','mail_provider',1,?,?,?,?) ON CONFLICT(id) DO UPDATE SET enabled=1,removed_at=NULL,secret_ciphertext=excluded.secret_ciphertext,cursor=excluded.cursor,last_error=NULL,updated_at=excluded.updated_at WHERE signal_sources.type='mail_provider'").bind(zoomSource,at,at,await config.security.seal(JSON.stringify(credentials)),JSON.stringify({checkedAt:at,scopes:auth.scopes})),audit(db,actor,'zoom.connected','zoom',zoomSource)]);
}
export async function openConnection(db:D1Database,config:ZoomConfig){
 const row=await sourceRow(db);if(row?.type!=='mail_provider'||!row.enabled||!row.secret_ciphertext||!config.security)throw new ZoomError(409,'Zoom is unresolved setup. Connect it in Settings.');
 let credentials:ZoomCredentials;try{credentials=JSON.parse(await config.security.open(row.secret_ciphertext)) as ZoomCredentials;}catch{throw new ZoomError(409,'The saved Zoom credentials cannot be opened. Connect Zoom again.');}
 return {credentials,ciphertext:row.secret_ciphertext};
}
export async function authorized(db:D1Database,config:ZoomConfig){
 const saved=await openConnection(db,config);
 try{return {...saved,...await zoomToken(config,saved.credentials)};}catch(error){if(error instanceof ZoomError&&error.status===403)await refused(db,error.message);throw error;}
}
export function refused(db:D1Database,reason:string){return db.prepare('UPDATE signal_sources SET enabled=0,last_error=? WHERE id=?').bind(reason,zoomSource).run();}
export function connectionFence(db:D1Database,ciphertext:string){return db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'zoom_authority_fence',NULL WHERE NOT EXISTS(SELECT 1 FROM signal_sources WHERE id=? AND type='mail_provider' AND enabled=1 AND removed_at IS NULL AND secret_ciphertext=?)").bind(zoomSource,ciphertext);}
export async function disconnect(db:D1Database,actor:string){await db.batch([db.prepare("UPDATE signal_sources SET enabled=0,secret_ciphertext=NULL,last_error='Disconnected in Settings.' WHERE id=?").bind(zoomSource),audit(db,actor,'zoom.disconnected','zoom',zoomSource)]);}
