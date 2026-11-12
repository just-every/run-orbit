import type {AuthenticatedOperator} from '../../identity';
import {ImportRepository,importAuthority} from '../repository';
import {RecordError} from '../../records/shared';
export const sfId=(value:unknown):value is string=>typeof value==='string'&&/^[A-Za-z0-9]{15}(?:[A-Za-z0-9]{3})?$/.test(value);
export async function authorized(db:D1Database,actor:AuthenticatedOperator){
 await new ImportRepository(db,actor).authorized();
 if(!await db.prepare("SELECT id FROM operators WHERE id=? AND setup_owner=1 AND status='active'").bind(actor.operatorId).first())throw new RecordError(403,'Only the installation owner may connect or pull Salesforce.');
}
/** Repeat the native check inside every custody transaction, after provider awaits. */
export function fence(db:D1Database,actor:AuthenticatedOperator){const p=importAuthority(actor);return db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'salesforce_authority',NULL WHERE NOT ((${p.sql}) AND EXISTS(SELECT 1 FROM operators WHERE id=? AND setup_owner=1))`).bind(...p.params!,actor.operatorId);}
export function instanceOrigin(value:unknown){
 if(typeof value!=='string')throw new RecordError(409,'Salesforce did not return a trusted instance.');
 const url=new URL(value);
 if(url.protocol!=='https:'||url.port||url.username||url.password||url.pathname!=='/'||url.search||url.hash||!/^([a-z0-9-]+\.)+(?:salesforce\.com|cloudforce\.com)$/.test(url.hostname))throw new RecordError(409,'Salesforce did not return a trusted instance.');
 return url.origin;
}
export const oauthHost=(sandbox:boolean)=>sandbox?'https://test.salesforce.com':'https://login.salesforce.com';
export const callbackPath='/api/v1/imports/salesforce/oauth/callback';
export const api='/services/data/v65.0';
export const random=()=>btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
