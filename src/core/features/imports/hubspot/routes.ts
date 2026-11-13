import {audit} from '../../records/shared';
import {sha256} from '../../../../modules/import-kit/d1/index';
import {Hono} from 'hono';
import {z} from 'zod';
import type {AuthenticatedOperator} from '../../identity';
import {ImportRepository} from '../repository';
import {HubSpotError,type HubSpotConfig} from './provider';
import {connect,connectionView,owner} from './connection';
import {nextPage,pages,readPull,pullView,startPull} from './inventory';
import {bundle} from './bundle';
const options=z.object({owners:z.record(z.string().max(200),z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/).nullable()).default({}),stages:z.record(z.string().max(200),z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/)).default({}),contactability:z.enum(['mapped_permission','confirmed_contactable']).default('mapped_permission')}).strict();
export function hubspotRoutes(db:D1Database,config:HubSpotConfig){const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>();
 app.onError((error,c)=>error instanceof HubSpotError?c.json({error:error.message,retryAt:error.retryAt},error.status):c.json({error:'HubSpot import stopped. Review its saved checkpoint and connection settings.'},409));
 app.use('*',async(c,next)=>{await owner(db,c.get('operator'));await next();});
 app.get('/connection',async c=>c.json(await connectionView(db)));
 app.post('/connection',async c=>{const parsed=z.object({token:z.string().trim().min(1).max(1000)}).strict().safeParse(await c.req.json());if(!parsed.success)throw new HubSpotError(400,'Enter the read-only HubSpot private-app token.');return c.json(await connect(db,config,c.get('operator'),parsed.data.token));});
 app.post('/disconnect',async c=>{await db.batch([db.prepare('DELETE FROM crm_import_hubspot_connection'),db.prepare("UPDATE crm_import_hubspot_pulls SET state='withdrawn',queue_json='[]',error='HubSpot disconnected'"),db.prepare('DELETE FROM crm_import_hubspot_pages'),audit(db,c.get('operator').operatorId,'hubspot.disconnected','hubspot','connection')]);return c.json(await connectionView(db));});
 app.get('/pulls',async c=>{const rows=(await db.prepare('SELECT * FROM crm_import_hubspot_pulls WHERE actor_id=? ORDER BY created_at DESC LIMIT 1').bind(c.get('operator').operatorId).all<any>()).results;return c.json({pull:rows.length?pullView(rows[0]):null});});
 app.post('/pulls',async c=>c.json(pullView(await startPull(db,config,c.get('operator')))));
 app.get('/pulls/:id',async c=>{const pull=await readPull(db,c.get('operator'),c.req.param('id'));return c.json({...pullView(pull),...pull.state==='reviewable'?{source:bundle(pull.portal_id,await pages(db,pull.id),{stages:{},contactability:'mapped_permission'}).source}:{}});});
 app.post('/pulls/:id/next',async c=>c.json(await nextPage(db,config,c.get('operator'),c.req.param('id'))));
 app.post('/pulls/:id/review',async c=>{
  const input=options.safeParse(await c.req.json());if(!input.success)throw new HubSpotError(400,'Choose explicit Orbit owner and stage mappings.');
  const pull=await readPull(db,c.get('operator'),c.req.param('id'));if(pull.state!=='reviewable')throw new HubSpotError(409,'Finish pulling every HubSpot page before reviewing.');
  const {input:sourceInput,source}=bundle(pull.portal_id,await pages(db,pull.id),input.data),review=await new ImportRepository(db,c.get('operator')).dryRun(sourceInput,(await pages(db,pull.id)).map(page=>({name:`hubspot/page-${page.ordinal}.json`,sha256:sha256(page.page_json),size:Buffer.byteLength(page.page_json),original:{status:'available' as const,base64:Buffer.from(page.page_json).toString('base64')}})));
  const byKind:Record<string,string>={companies:'company',contacts:'contact',deals:'deal',notes:'note',calls:'call',meetings:'meeting',tasks:'task'};const reconciled={...source,reconciliation:Object.fromEntries(Object.entries(source.totals).map(([object,total])=>[object,{total,...Object.fromEntries(['ready','linked','rejected'].map(status=>[status,review.rows.filter(row=>row.kind===byKind[object]&&row.status===status).length]))}]))};
  await db.prepare('INSERT INTO crm_import_hubspot_reviews VALUES(?,?,?)').bind(review.id,pull.id,JSON.stringify(reconciled)).run();return c.json({...review,hubspot:reconciled});
 });return app;
}
