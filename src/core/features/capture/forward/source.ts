import type {SourceSecurity} from '../../../platform/source-security';
import {connectSource,captureConnectionFence} from '../sources';
import {CaptureError} from '../contracts';
import {payloadHash} from '../../../platform/source-security';
import {formatAddress,newTag,type MailboxConfig} from './address';
import type {ForwardingConfirmation} from './confirmation';

export const FORWARD_SOURCE_ID='capture-forward';
const scope={mail:{folders:['Mail sent to your Orbit address']}};
/** The private tag and any forwarding confirmations live sealed with the source's credential, never in archives. */
export interface ForwardCredential {tag:string;confirmations:ForwardingConfirmation[]}
interface ForwardRow {id:string;adapter:string;name:string;state:string;connection_id:string|null;ciphertext:string|null}

async function row(db:D1Database){
 return db.prepare('SELECT c.id,c.adapter,c.name,c.state,c.connection_id,k.ciphertext FROM capture_sources c LEFT JOIN capture_credentials k ON k.source_id=c.id WHERE c.id=?').bind(FORWARD_SOURCE_ID).first<ForwardRow>();
}

/** The live forwarding source and its credential, or null when there is no working address. */
export async function forwardSource(db:D1Database,security:SourceSecurity){
 const source=await row(db);
 if(!source||source.state==='disconnected'||!source.ciphertext)return null;
 return {source:{id:source.id,name:source.name,connection_id:source.connection_id},credential:JSON.parse(await security.open(source.ciphertext)) as ForwardCredential};
}

export async function forwardStatus(db:D1Database,security:SourceSecurity|undefined,config:MailboxConfig|null){
 const live=security?await forwardSource(db,security):null;
 return {
  configured:Boolean(config),available:Boolean(security),
  address:live&&config?formatAddress(config,live.credential.tag):null,
  confirmations:live?.credential.confirmations??[],
 };
}

/** Creates the address, or replaces it: the old address stops reaching Orbit at once. */
export async function createForwardAddress(db:D1Database,security:SourceSecurity,config:MailboxConfig,actor:string,fences:D1PreparedStatement[]){
 const credential:ForwardCredential={tag:newTag(),confirmations:[]};
 await connectSource(db,{id:FORWARD_SOURCE_ID,adapter:'forward',name:'Orbit address',scope,credential:JSON.stringify(credential)},security,actor,fences);
 return formatAddress(config,credential.tag);
}

/** Keeps the three latest confirmations; a reconnect in between discards the write. */
export async function rememberConfirmation(db:D1Database,security:SourceSecurity,live:{source:{id:string;connection_id:string|null};credential:ForwardCredential},confirmation:ForwardingConfirmation){
 const next:ForwardCredential={...live.credential,confirmations:[confirmation,...live.credential.confirmations].slice(0,3)};
 await db.prepare("UPDATE capture_credentials SET ciphertext=?,updated_at=? WHERE source_id=? AND EXISTS(SELECT 1 FROM capture_sources WHERE id=? AND connection_id IS ? AND state<>'disconnected')")
  .bind(await security.seal(JSON.stringify(next)),new Date().toISOString(),live.source.id,live.source.id,live.source.connection_id).run();
}

/** An opaque revision binds the configured destination and exact current sealed connection. */
async function rotationSource(db:D1Database,config:MailboxConfig){
 const source=await row(db);
 if(!source||source.adapter!=='forward'||source.state!=='connected'||!source.connection_id||!source.ciphertext)throw new CaptureError(409,'Create a working Orbit address in Capture first.');
 return {...source,connection_id:source.connection_id,ciphertext:source.ciphertext,
  revision:await payloadHash(JSON.stringify([source.adapter,source.state,source.connection_id,source.ciphertext,config.local,config.domain]))};
}
export async function forwardAddressRevision(db:D1Database,config:MailboxConfig){return (await rotationSource(db,config)).revision;}

/** Rotate only an existing native address. No destination or authority comes from the request. */
export async function rotateForwardAddress(db:D1Database,security:SourceSecurity,config:MailboxConfig,actor:string,revision:string,fences:D1PreparedStatement[]=[]){
 const source=await rotationSource(db,config);
 if(source.revision!==revision)throw new CaptureError(409,'The Orbit address changed; read its current revision first.');
 try{await createForwardAddress(db,security,config,actor,[...fences,captureConnectionFence(db,source)]);}
 catch(error){if(error instanceof CaptureError&&error.status===409)throw new CaptureError(409,'The Orbit address changed before rotation.');throw error;}
 return {id:FORWARD_SOURCE_ID,rotated:true,revision:await forwardAddressRevision(db,config)};
}
