import {Hono} from 'hono';
import {boundedRequestBody,RequestBodyTooLarge} from '../../platform/bounded-request-body';
import {archiveImportActive} from '../../platform/archive-maintenance';
import {bearer,currentGrant,revoke} from './authority';
import {installation,snapshot} from './evidence';
import {receipt,writeHandoff} from './effects';
import {DelegationError,deny,effectSchema,scoped,type Grant,requestedRecordState,recordStateSchema} from './protocol';
import {exchange} from './token';
export function delegationRoutes(db:D1Database){
 const app=new Hono<{Variables:{grant:Grant}}>();
 app.onError((e,c)=>{c.header('Cache-Control','no-store');if(e instanceof SyntaxError)return c.json({error:{code:'INVALID_REQUEST',message:'INVALID_REQUEST'}},400);if(e instanceof DelegationError)return c.json({error:{code:e.code,message:e.code}},e.status as 400);return c.json({error:{code:'UNAVAILABLE',message:'UNAVAILABLE'}},503);});
 app.use('*',async(c,next)=>{c.header('Cache-Control','no-store');try{
 if(await archiveImportActive(db))deny(503,'UNAVAILABLE');
 // Server credentials never rely on ambient cookies; browser mutations retain Origin checks.
 if(!['GET','HEAD'].includes(c.req.method)&&c.req.header('Origin')&&c.req.header('Origin')!==new URL(c.req.url).origin)deny(403,'SCOPE_DENIED');
 if(!['GET','HEAD'].includes(c.req.method)){const body=await boundedRequestBody(c.req.raw,64*1024);c.req.raw=new Request(c.req.raw,{body});}
 await next();
 }catch(e){if(e instanceof DelegationError)return c.json({error:{code:e.code,message:e.code}},e.status as 400);if(e instanceof RequestBodyTooLarge)return c.json({error:{code:'SOURCE_TOO_LARGE',message:'SOURCE_TOO_LARGE'}},413);return c.json({error:{code:'UNAVAILABLE',message:'UNAVAILABLE'}},503);}});
 app.post('/token',async c=>c.json(await exchange(db,await c.req.parseBody())));
 app.use('*',async(c,next)=>{c.set('grant',await bearer(db,c.req.raw));await next();});
 app.post('/revoke',async c=>{await revoke(db,c.get('grant'));return c.json({revoked:true});});
 app.get('/identity',async c=>{const withState=requestedRecordState(c.req.header('X-RER-Record-State-Schema'));const g=c.get('grant'),i=await installation(db),s:string[]=JSON.parse(g.scopes_json);const operator=await db.prepare('SELECT display_name FROM operators WHERE id=?').bind(g.principal_id).first<{display_name:string}>();await currentGrant(db,g.id,g);return c.json({protocol:'rer-delegation/1',provider:'orbit',installationId:i.id,accountId:g.account_id,principalId:g.principal_id,label:operator!.display_name,grantId:g.id,expiresAt:g.expires_at,scopes:s,targets:JSON.parse(g.targets_json),capabilities:{...(withState&&s.includes('crm.evidence.read')?{recordStateSchemas:[recordStateSchema]}:{}),readKinds:s.includes('crm.evidence.read')?['crm.opportunity','crm.contact','crm.company','crm.signal','crm.handoff']:[],operations:s.includes('crm.handoff.write')?['orbit.handoff.upsert']:[],conditionalWrite:true,providerIdempotency:true,readBack:true,reconciliationAttribution:true}});});
 for(const path of ['evidence','check','audience'])app.get('/'+path,async c=>{const withState=requestedRecordState(c.req.header('X-RER-Record-State-Schema'));const g=c.get('grant'),target=c.req.query('target')??'';scoped(g,target,path==='audience'&&c.req.query('operation')==='orbit.handoff.upsert'?'crm.handoff.write':'crm.evidence.read');if(path==='audience'&&c.req.query('operation')&&c.req.query('operation')!=='orbit.handoff.upsert')deny(422,'UNSUPPORTED_OPERATION');const s=await snapshot(db,target,path!=='evidence',withState&&path!=='audience');await currentGrant(db,g.id,g);if(path==='audience')return c.json(s.audience);const {audienceRevision:_,...audience}=s.audience;return c.json({...(withState&&path!=='audience'?{recordState:s.recordState}:{}),provider:'orbit',installationId:s.installationId,accountId:g.account_id,principalId:g.principal_id,target,revision:s.revision,observedAt:new Date().toISOString(),audience,...(path==='evidence'?{title:s.title,text:s.text,canonicalUrl:new URL(`/app/${target.startsWith('opportunities/')?'opportunities/'+target.split('/')[1]:'records'}`,c.req.url).href}:{})});});
 app.post('/effects',async c=>{const parsed=effectSchema.safeParse(await c.req.json());if(!parsed.success)deny(400,'INVALID_REQUEST');const g=c.get('grant');return c.json(await writeHandoff(db,parsed.data!,{grant:g,actor:g.principal_id}));});
 app.get('/effects/:key',async c=>c.json(await receipt(db,c.get('grant'),c.req.param('key'))));
 return app;
}
