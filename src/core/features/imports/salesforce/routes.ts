import {Hono} from 'hono';
import {z} from 'zod';
import type {AuthenticatedOperator} from '../../identity';
import type {SourceSecurity} from '../../../platform/source-security';
import {RecordError,audit} from '../../records/shared';
import {authorized,fence,callbackPath} from './security';
import {startOAuth,finishOAuth,type SalesforceFetch} from './oauth';
import {SalesforcePulls} from './checkpoint';
const id=z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
const ownerMap=z.record(z.string().max(240),id.nullable());
export function salesforceRoutes(db:D1Database,options:{security?:SourceSecurity;origin?:string;fetcher?:SalesforceFetch}){
 const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>();
 const security=()=>{if(!options.security)throw new RecordError(409,'Salesforce needs an installation encryption key before connecting.');return options.security;};
 const origin=(c:any)=>{const current=new URL(c.req.url).origin;if(options.origin&&current!==new URL(options.origin).origin)throw new RecordError(403,'Use the configured installation origin for Salesforce.');return current;};
 const pulls=(c:any)=>new SalesforcePulls(db,security(),c.get('operator'),options.fetcher??fetch);
 app.onError((error,c)=>{const message=error instanceof RecordError?error.message:'Salesforce could not safely complete this request. Resume the saved checkpoint or reconnect.';return c.json({error:message},error instanceof RecordError?error.status:409);});
 app.use('*',async(c,next)=>{await authorized(db,c.get('operator'));await next();});
 app.get('/',async c=>c.json({available:!!options.security,callback:origin(c)+callbackPath,connections:(await db.prepare('SELECT id,org_id,instance,created_at FROM crm_import_salesforce_connections WHERE actor_id=? ORDER BY created_at DESC').bind(c.get('operator').operatorId).all()).results,pulls:(await db.prepare('SELECT id,state,page,error,created_at FROM crm_import_salesforce_pulls WHERE actor_id=? ORDER BY created_at DESC LIMIT 25').bind(c.get('operator').operatorId).all()).results}));
 app.post('/oauth/start',async c=>{const parsed=z.object({clientId:z.string().trim().min(1).max(1000),clientSecret:z.string().min(1).max(4000),sandbox:z.boolean(),confirmedReadOnly:z.literal(true)}).strict().safeParse(await c.req.json());if(!parsed.success)throw new RecordError(400,'Enter the Salesforce client ID and secret and choose the authorized environment.');return c.json(await startOAuth(db,security(),c.get('operator'),origin(c),parsed.data));});
 app.get('/oauth/callback',async c=>{c.header('Referrer-Policy','no-referrer');try{await finishOAuth(db,security(),c.get('operator'),origin(c),c.req.query(),options.fetcher??fetch);return c.redirect('/app/settings/data/import?salesforce=connected',303);}catch(error){const message=error instanceof RecordError?error.message:'Salesforce connection could not be verified. Start again.';return c.redirect('/app/settings/data/import?salesforceError='+encodeURIComponent(message),303);}});
 app.post('/connections/:id/disconnect',async c=>{
  if((await c.req.json()).confirmed!==true)throw new RecordError(400,'Confirm disconnection. Saved pulls and reviews will be withdrawn.');
  const actor=c.get('operator'),connection=c.req.param('id');
  if(!await db.prepare('SELECT id FROM crm_import_salesforce_connections WHERE id=? AND actor_id=?').bind(connection,actor.operatorId).first())throw new RecordError(404,'Salesforce connection not found.');
  await db.batch([fence(db,actor),db.prepare('DELETE FROM crm_import_salesforce_oauth WHERE operator_id=?').bind(actor.operatorId),db.prepare("DELETE FROM crm_import_review_chunks WHERE review_id IN(SELECT r.id FROM crm_import_reviews r JOIN crm_import_salesforce_connections c ON r.namespace='orbit:salesforce:'||c.org_id WHERE c.id=? AND r.actor_id=?)").bind(connection,actor.operatorId),db.prepare("UPDATE crm_import_reviews SET plan_json='null',fingerprint='',safety_pending=0 WHERE id IN(SELECT r.id FROM crm_import_reviews r JOIN crm_import_salesforce_connections c ON r.namespace='orbit:salesforce:'||c.org_id WHERE c.id=? AND r.actor_id=?)").bind(connection,actor.operatorId),db.prepare('DELETE FROM crm_import_salesforce_connections WHERE id=? AND actor_id=?').bind(connection,actor.operatorId),audit(db,actor.operatorId,'salesforce.disconnected','salesforce_connection',connection)]);return c.json({disconnected:true});
 });
 app.post('/connections/:id/pulls',async c=>c.json(await pulls(c).start(c.req.param('id'))));
 app.get('/pulls/:id',async c=>c.json({...await pulls(c).status(c.req.param('id')),owners:await pulls(c).owners(c.req.param('id'))}));
 app.post('/pulls/:id/advance',async c=>c.json(await pulls(c).advance(c.req.param('id'))));
 app.post('/pulls/:id/dry-run',async c=>{const parsed=z.object({owners:ownerMap,customFields:z.object({Account:z.array(z.string()).max(100).optional(),Contact:z.array(z.string()).max(100).optional()}).strict().optional()}).strict().safeParse(await c.req.json());if(!parsed.success)throw new RecordError(400,'Review separate Account and Contact owners and available custom fields.');return c.json(await pulls(c).dryRun(c.req.param('id'),parsed.data));});
 return app;
}
