import {sourceFields} from './bundle';
import {createId} from '../../../shared/ids';
import type {AuthenticatedOperator} from '../../identity';
import {importAuthority} from '../repository';
import {canonicalJson,sha256} from '../../../../modules/import-kit/d1/index';
import {openConnection,refuseConnection} from './connection';
import {hubspotRead,HubSpotError,objectTypes,readScopes,type HubSpotConfig,type ObjectType} from './provider';
export interface PageJob {kind:'owners'|'pipelines'|'properties'|'objects'|'associations';path:string;object?:ObjectType;sourceId?:string;target?:string}
export interface Pull {id:string;actor_id:string;connection_id:string;portal_id:string;state:string;queue_json:string;checkpoint:number;validated:number;retry_at:string|null;error:string|null}
export interface Page {ordinal:number;path:string;page_json:string}
const associations:Record<ObjectType,string[]>={companies:['contacts'],contacts:['companies'],deals:['companies','contacts'],notes:['companies','contacts','deals'],calls:['companies','contacts','deals'],meetings:['companies','contacts','deals'],tasks:['companies','contacts','deals']};
export async function startPull(db:D1Database,config:HubSpotConfig,actor:AuthenticatedOperator){
 const {row}=await openConnection(db,config,actor),id=createId(),queue:PageJob[]=[{kind:'owners',path:'/crm/v3/owners/?limit=100'},{kind:'pipelines',path:'/crm/v3/pipelines/deals'},...objectTypes.map(object=>({kind:'properties' as const,object,path:`/crm/v3/properties/${object}`}))],p=importAuthority(actor);
 await db.prepare(`INSERT INTO crm_import_hubspot_pulls(id,actor_id,connection_id,portal_id,state,queue_json,created_at) SELECT ?,?,?,?,'pulling',?,? WHERE ${p.sql}`).bind(id,actor.operatorId,row.id,row.portal_id,JSON.stringify(queue),new Date().toISOString(),...p.params!).run();return readPull(db,actor,id);
}
export async function readPull(db:D1Database,actor:AuthenticatedOperator,id:string){const row=await db.prepare('SELECT * FROM crm_import_hubspot_pulls WHERE id=? AND actor_id=?').bind(id,actor.operatorId).first<Pull>();if(!row)throw new HubSpotError(404,'HubSpot pull not found.');return row;}
export async function pages(db:D1Database,id:string){return(await db.prepare('SELECT ordinal,path,page_json FROM crm_import_hubspot_pages WHERE pull_id=? ORDER BY ordinal').bind(id).all<Page>()).results;}
export const pullView=(row:Pull)=>({id:row.id,state:row.state,checkpoint:row.checkpoint,remaining:JSON.parse(row.queue_json).length,validated:row.validated,retryAt:row.retry_at,error:row.error});
export function retryReady(row:Pull){if(row.retry_at&&Date.parse(row.retry_at)>Date.now())throw new HubSpotError(429,row.error??'Wait for HubSpot before resuming.',row.retry_at);if(row.state==='withdrawn')throw new HubSpotError(409,'Source withdrawn after privacy erasure. Start with a fresh HubSpot export.');}
async function checkedRead(db:D1Database,config:HubSpotConfig,actor:AuthenticatedOperator,pull:Pull,path:string){
 retryReady(pull);const {row,token}=await openConnection(db,config,actor);if(row.id!==pull.connection_id)throw new HubSpotError(409,'The HubSpot connection changed. Start a new pull with its current permissions.');
 try{return await hubspotRead(config,token,path);}catch(error){if(error instanceof HubSpotError){await db.prepare('UPDATE crm_import_hubspot_pulls SET error=?,retry_at=? WHERE id=?').bind(error.message,error.retryAt,pull.id).run();await refuseConnection(db,error);}throw error;}
}
function fenced(db:D1Database,actor:AuthenticatedOperator,pull:Pull){const p=importAuthority(actor);return db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'hubspot_page_fence',NULL WHERE NOT (${p.sql}) OR NOT EXISTS(SELECT 1 FROM operators WHERE id=? AND setup_owner=1) OR NOT EXISTS(SELECT 1 FROM crm_import_hubspot_connection WHERE id=? AND state='connected' AND secret_ciphertext IS NOT NULL) OR NOT EXISTS(SELECT 1 FROM crm_import_hubspot_pulls WHERE id=? AND checkpoint=? AND validated=? AND state<>'withdrawn')`).bind(...p.params!,actor.operatorId,pull.connection_id,pull.id,pull.checkpoint,pull.validated);}
export async function nextPage(db:D1Database,config:HubSpotConfig,actor:AuthenticatedOperator,id:string){
 const pull=await readPull(db,actor,id);retryReady(pull);const queue=JSON.parse(pull.queue_json) as PageJob[];if(!queue.length)return pullView(pull);
 const job=queue.shift()!,data=await checkedRead(db,config,actor,pull,job.path);
 if(!Array.isArray(data.results))throw new HubSpotError(502,'HubSpot returned an incomplete inventory. Nothing was skipped; export the refused object with its associations.');
 const allPages=await pages(db,id);
 if(job.kind==='objects'&&data.results.length+allPages.filter(page=>{const p=JSON.parse(page.page_json);return p.job.kind==='objects'&&p.job.object===job.object;}).reduce((n,page)=>n+JSON.parse(page.page_json).data.results.length,0)>1000)throw new HubSpotError(409,`HubSpot ${job.object} exceeds 1,000 rows in this reviewed bundle. Export smaller CSV batches with stable IDs; no rows were discarded.`);
 if(job.kind==='properties'){
  const included=new Set([...Object.values(sourceFields[job.object!]),...job.object==='deals'?['pipeline','dealstage']:[],...job.object==='calls'?['hs_call_title','hs_call_direction','hs_call_status']:[],...job.object==='meetings'?['hs_meeting_title']:[]]);const names=data.results.filter((property:any)=>included.has(property.name)||!property.hubspotDefined||/^hs_email_optout_/.test(property.name)).map((property:any)=>property.name);if(names.some((name:any)=>typeof name!=='string'||!/^[_a-zA-Z0-9]+$/.test(name)))throw new HubSpotError(409,`HubSpot ${job.object} has unsupported property names. Export those fields explicitly.`);
  queue.push({kind:'objects',object:job.object,path:`/crm/v3/objects/${job.object}?limit=100&properties=${encodeURIComponent(names.join(','))}`});
 }
 if(job.kind==='objects')for(const item of data.results){if(typeof item.id!=='string'||!item.id||item.id.length>100)throw new HubSpotError(409,'HubSpot returned an invalid stable object ID. Export this object explicitly.');for(const target of associations[job.object!])queue.push({kind:'associations',object:job.object,sourceId:item.id,target,path:`/crm/v4/objects/${job.object}/${encodeURIComponent(item.id)}/associations/${target}?limit=500`});}
 if(data.paging?.next){const after=data.paging.next.after;if(typeof after!=='string'&&typeof after!=='number')throw new HubSpotError(502,'HubSpot pagination has no stable cursor.');const url=new URL(`https://api.hubapi.com${job.path}`);url.searchParams.set('after',String(after));const path=url.pathname+url.search;if(allPages.some(page=>page.path===path)||path===job.path)throw new HubSpotError(409,'HubSpot repeated a page cursor. Nothing was skipped.');queue.unshift({...job,path});}
 await db.batch([fenced(db,actor,pull),db.prepare('INSERT INTO crm_import_hubspot_pages VALUES(?,?,?,?)').bind(id,pull.checkpoint,job.path,JSON.stringify({job,data})),db.prepare('UPDATE crm_import_hubspot_pulls SET queue_json=?,checkpoint=checkpoint+1,state=?,retry_at=NULL,error=NULL WHERE id=?').bind(JSON.stringify(queue),queue.length?'pulling':'reviewable',id)]);
 return pullView(await readPull(db,actor,id));
}
/** Recheck every reviewed provider page before publishing records. This detects changed source and revoked scope;
 * rate limits commit no record effects and resume at the last checked page, then Kit checkpoints publish the saved bundle. */
export async function validatePage(db:D1Database,config:HubSpotConfig,actor:AuthenticatedOperator,pullId:string){
 const pull=await readPull(db,actor,pullId);retryReady(pull);if(pull.state!=='reviewable')throw new HubSpotError(409,'Finish the HubSpot pull before applying its reviewed bundle.');
 const saved=await pages(db,pullId);if(!saved.length)throw new HubSpotError(409,'The saved HubSpot source is unavailable. Pull it again.');
 const page=saved[pull.validated];if(!page){const {row,token}=await openConnection(db,config,actor);if(row.id!==pull.connection_id)throw new HubSpotError(409,'The HubSpot connection changed. Start a new pull.');try{const info=await hubspotRead(config,token,'/oauth/v2/private-apps/get/access-token-info',{tokenKey:token});if(String(info.hubId)!==pull.portal_id||!Array.isArray(info.scopes)||readScopes.some(scope=>!info.scopes.includes(scope))||info.scopes.some((scope:unknown)=>typeof scope!=='string'||!scope.endsWith('.read')))throw new HubSpotError(409,'HubSpot authorization changed. Reconnect the read-only private app and review a new pull.');}catch(error){if(error instanceof HubSpotError)await refuseConnection(db,error);throw error;}return null;}
 const next=await checkedRead(db,config,actor,pull,page.path),prior=JSON.parse(page.page_json).data;
 if(sha256(canonicalJson(next))!==sha256(canonicalJson(prior)))throw new HubSpotError(409,'HubSpot changed since this dry run. Start a new pull and review the changed source before applying.');
 await db.batch([fenced(db,actor,pull),db.prepare('UPDATE crm_import_hubspot_pulls SET validated=validated+1,error=NULL,retry_at=NULL WHERE id=?').bind(pullId)]);
 return{id:pullId,job:{state:'applying',checkpoint:pull.validated+1,total:saved.length,sourceValidation:true}};
}
