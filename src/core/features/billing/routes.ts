import {Hono} from 'hono';
import {z} from 'zod';
import type {AuthenticatedOperator} from '../identity';
import {billingAuthority} from './authority';
import {billingConnection,connectStripe,disconnectStripe} from './connection';
import {BillingError,identityId,stripeEventPath,type BillingConfig} from './contracts';
import {linkMapping,mappingConfirmation,mappingTarget,reviewMapping} from './mapping';
import {billingTimeline,unlinkedBilling} from './timeline';

type Environment={Variables:{operator:AuthenticatedOperator}};
function billingRoutes(db:D1Database,owner=false){
 const app=new Hono<Environment>();
 app.onError((error,c)=>c.json({error:error instanceof BillingError?error.message:'The Stripe operation could not be completed. Check its current state before trying again.'},error instanceof BillingError?error.status:503));
 app.use('*',async(c,next)=>{await billingAuthority(db,c.get('operator').operatorId,owner);await next();});return app;
}
export function stripeSettingsRoutes(db:D1Database,config:BillingConfig){
 const app=billingRoutes(db);
 app.get('/',async c=>{
  const actor=c.get('operator').operatorId,owner=Boolean(await db.prepare("SELECT 1 FROM operators WHERE id=? AND setup_owner=1 AND status='active'").bind(actor).first());
  return c.json({...await billingConnection(db),owner,webhookUrl:owner?new URL(stripeEventPath,config.origin??c.req.url).href:null});
 });
 app.post('/connect',async c=>{
  const actor=c.get('operator').operatorId;await billingAuthority(db,actor,true);
  const parsed=z.object({apiKey:z.string().trim().min(1).max(512),webhookSecret:z.string().trim().min(1).max(512)}).strict().safeParse(await c.req.json());
  if(!parsed.success)throw new BillingError(400,'Enter a restricted Stripe test key and the endpoint signing secret.');
  await connectStripe(db,config,parsed.data.apiKey,parsed.data.webhookSecret,actor);return c.json({connected:true});
 });
 app.post('/disconnect',async c=>{const actor=c.get('operator').operatorId;await billingAuthority(db,actor,true);await disconnectStripe(db,actor);return c.json({disconnected:true});});return app;
}
export function stripeBillingRoutes(db:D1Database,config:BillingConfig){
 const app=billingRoutes(db);
 app.post('/stripe/review',async c=>{const parsed=mappingTarget.safeParse(await c.req.json());if(!parsed.success)throw new BillingError(400,'Choose a Stripe customer, company and deal.');return c.json(await reviewMapping(db,config,parsed.data,c.get('operator').operatorId));});
 app.post('/stripe/link',async c=>{const parsed=mappingConfirmation.safeParse(await c.req.json());if(!parsed.success)throw new BillingError(400,'Confirm the exact reviewed customer identity.');return c.json(await linkMapping(db,config,parsed.data,c.get('operator').operatorId),201);});
 app.get('/stripe/unlinked',async c=>c.json(await unlinkedBilling(db)));
 app.get('/:kind/:id',async c=>{const kind=c.req.param('kind'),id=c.req.param('id');if((kind!=='company'&&kind!=='opportunity')||!identityId.test(id))throw new BillingError(400,'Choose a company or deal billing timeline.');return c.json(await billingTimeline(db,kind,id));});return app;
}
