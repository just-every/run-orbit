import {audit} from '../records/shared';
import {guard} from '../identity/store';
import {authorityGuard,endGuard,requireActor} from './authority';
import {SupportError,now,type Actor,type Connection,type Credentials,type Installation,type SupportConfig} from './contracts';
import {zendesk,ZendeskFailure} from './provider';
export async function installation(db:D1Database){return db.prepare('SELECT * FROM support_installation WHERE id=1').first<Installation>();}
export async function connectionStatus(db:D1Database){const row=await installation(db),held=Boolean(await db.prepare('SELECT 1 FROM support_credentials WHERE id=1').first());return{state:row?.state==='connected'&&held?'connected' as const:'unresolved-setup' as const,reason:row?.state==='connected'&&held?null:row?.error??'Connect Zendesk in Settings.',subdomain:row?.subdomain??null,checkedAt:row?.checked_at??null,generation:row?.generation??null};}
export async function openConnection(db:D1Database,config:SupportConfig):Promise<Connection>{
 const row=await installation(db),sealed=await db.prepare('SELECT ciphertext FROM support_credentials WHERE id=1').first<{ciphertext:string}>();
 if(!row||row.state!=='connected'||!sealed||!config.security)throw new SupportError(409,'Zendesk is unavailable. Connect it in Settings.');
 try{return{installation:row,credentials:JSON.parse(await config.security.open(sealed.ciphertext)) as Credentials,ciphertext:sealed.ciphertext};}catch{throw new SupportError(409,'Zendesk credentials cannot be opened. Reconnect in Settings.');}
}
export function connectionGuard(db:D1Database,connection:Connection){return guard(db,{sql:"EXISTS(SELECT 1 FROM support_installation i JOIN support_credentials c ON c.id=i.id WHERE i.id=1 AND i.state='connected' AND i.generation=? AND c.ciphertext=?)",args:[connection.installation.generation,connection.ciphertext]});}
export async function stillConnected(db:D1Database,snapshot:Connection){const row=await installation(db);if(row?.state!=='connected'||row.generation!==snapshot.installation.generation||!await db.prepare('SELECT 1 FROM support_credentials WHERE id=1 AND ciphertext=?').bind(snapshot.ciphertext).first())throw new SupportError(409,'Zendesk authority changed. Review again.');}
export async function providerCall<T>(db:D1Database,config:SupportConfig,connection:Connection,path:string,body?:unknown){
 try{const result=await zendesk<T>(config,connection.installation.subdomain,connection.credentials,path,body);await stillConnected(db,connection);return result;}
 catch(error){if(error instanceof ZendeskFailure&&error.status===401)await db.batch([db.prepare("UPDATE support_installation SET state='paused',error='Zendesk refused the saved token. Reconnect in Settings.' WHERE generation=?").bind(connection.installation.generation),db.prepare('DELETE FROM support_credentials WHERE id=1 AND ciphertext=?').bind(connection.ciphertext)]);throw error;}
}
export async function connect(db:D1Database,config:SupportConfig,actor:Actor,input:Credentials&{subdomain:string}){
 await requireActor(db,actor,true);if(!config.security)throw new SupportError(503,'Zendesk needs the installation encryption key.');
 const previous=await installation(db);
 let me:{user?:{id:number;role:string;active:boolean;suspended?:boolean}};
 try{me=await zendesk(config,input.subdomain,input,'/api/v2/users/me.json');}catch(error){
  if(error instanceof ZendeskFailure){if(error.status===401||error.status===403)await db.batch([authorityGuard(db,actor,true),db.prepare("UPDATE support_installation SET state='paused',error='Zendesk refused the token. Check the account and credentials.' WHERE id=1"),db.prepare('DELETE FROM support_credentials'),endGuard(db)]);throw new SupportError(error.status===401||error.status===403?400:502,'Zendesk could not verify this token. Check the account and credentials.');}throw error;
 }
 if(!me.user?.active||me.user.suspended||!['admin','agent'].includes(me.user.role))throw new SupportError(400,'Zendesk requires an active agent account with ticket and organization access.');
 const generation=crypto.randomUUID(),checked=now(config).toISOString(),ciphertext=await config.security.seal(JSON.stringify({email:input.email,token:input.token,signingSecret:input.signingSecret}));
 await requireActor(db,actor,true);
 await db.batch([authorityGuard(db,actor,true),guard(db,{sql:'(SELECT generation FROM support_installation WHERE id=1) IS ?',args:[previous?.generation??null]}),db.prepare("INSERT INTO support_installation VALUES(1,?,'connected',?,?,NULL) ON CONFLICT(id) DO UPDATE SET subdomain=excluded.subdomain,state=excluded.state,generation=excluded.generation,checked_at=excluded.checked_at,error=NULL").bind(input.subdomain,generation,checked),db.prepare('INSERT INTO support_credentials VALUES(1,?) ON CONFLICT(id) DO UPDATE SET ciphertext=excluded.ciphertext').bind(ciphertext),db.prepare('UPDATE support_mappings SET generation=NULL'),audit(db,actor.operatorId,'zendesk.connected','installation','workspace',{subdomain:input.subdomain}),endGuard(db)]);
}
export async function disconnect(db:D1Database,actor:Actor){await requireActor(db,actor,true);await db.batch([authorityGuard(db,actor,true),db.prepare('DELETE FROM support_credentials'),db.prepare("UPDATE support_installation SET state='paused',generation=?,error='Disconnected. Zendesk support is unavailable.' WHERE id=1").bind(crypto.randomUUID()),db.prepare('UPDATE support_mappings SET generation=NULL'),audit(db,actor.operatorId,'zendesk.disconnected','installation','workspace'),endGuard(db)]);}
