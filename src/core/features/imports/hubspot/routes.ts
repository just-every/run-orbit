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
 app.post('/disconnect',async c=>{await db.batch([db.prepare('DELETE FROM crm_import_hubspot_connection'),db.prepare("UPDATE crm_import_hubspot_pulls SET state='withdrawn',queue_json='[]',error='HubSpot disconnected'"),db.prepare('DELETE FROM crm_import_hubspot_pages')]);return c.json(await connectionView(db));});
 app.post('/pulls',async c=>c.json(pullView(await startPull(db,config,c.get('operator')))));
 app.get('/pulls/:id',async c=>{const pull=await readPull(db,c.get('operator'),c.req.param('id'));return c.json({...pullView(pull),...pull.state==='reviewable'?{source:bundle(pull.portal_id,await pages(db,pull.id),{stages:{},contactability:'mapped_permission'}).source}:{}});});
 app.post('/pulls/:id/next',async c=>c.json(await nextPage(db,config,c.get('operator'),c.req.param('id'))));
 app.post('/pulls/:id/review',async c=>{
  const input=options.safeParse(await c.req.json());if(!input.success)throw new HubSpotError(400,'Choose explicit Orbit owner and stage mappings.');
  const pull=await readPull(db,c.get('operator'),c.req.param('id'));if(pull.state!=='reviewable')throw new HubSpotError(409,'Finish pulling every HubSpot page before reviewing.');
  const {input:sourceInput,source}=bundle(pull.portal_id,await pages(db,pull.id),input.data),review=await new ImportRepository(db,c.get('operator')).dryRun(sourceInput);
  await db.prepare('INSERT INTO crm_import_hubspot_reviews VALUES(?,?,?)').bind(review.id,pull.id,JSON.stringify(source)).run();return c.json({...review,hubspot:source});
 });return app;
}
