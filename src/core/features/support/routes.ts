import {Hono} from 'hono';
import {z} from 'zod';
import type {AuthenticatedOperator} from '../identity';
import {refused} from '../identity/store';
import {RecordError} from '../records/shared';
import {requireActor} from './authority';
import {connect,connectionStatus,disconnect} from './connection';
import {mappingPlan,saveMapping} from './mapping';
import {tickets} from './tickets';
import {handoff,handoffPlan} from './handoff';
import {ZendeskFailure} from './provider';
import {SupportError,ownership,contextFields,type SupportConfig} from './contracts';
type Env={Variables:{operator:AuthenticatedOperator}};
const id=z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/),orgId=z.string().regex(/^[1-9]\d{0,15}$/),digest=z.string().regex(/^[a-f0-9]{64}$/);
const context=z.object({requesterId:orgId,title:z.string().trim().min(1).max(160),fields:z.array(z.enum(contextFields)).min(1).max(3),contactId:id.optional()});
function errors(app:Hono<Env>){app.onError((error,c)=>{if(error instanceof SupportError||error instanceof RecordError)return c.json({error:error.message},error.status);if(error instanceof ZendeskFailure)return c.json({error:'Zendesk is unavailable or refused access. No automatic retry is made.'},502);if(refused(error))return c.json({error:'Zendesk or Orbit authority changed. Review again.'},409);return c.json({error:'Zendesk support could not be verified.'},503);});}
export function zendeskSettingsRoutes(db:D1Database,config:SupportConfig){const app=new Hono<Env>();errors(app);
 app.get('/',async c=>{const actor=c.get('operator');await requireActor(db,actor);const owner=Boolean(await db.prepare("SELECT 1 FROM operators WHERE id=? AND setup_owner=1 AND status='active'").bind(actor.operatorId).first());return c.json({...await connectionStatus(db),owner,ownership,webhookUrl:owner?`${config.origin??new URL(c.req.url).origin}/api/v1/support/zendesk/webhook`:null});});
 app.post('/connect',async c=>{const input=z.object({subdomain:z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{0,62}$/),email:z.email().max(254),token:z.string().min(1).max(500),signingSecret:z.string().min(16).max(500)}).strict().safeParse(await c.req.json());if(!input.success)throw new SupportError(400,'Enter the Zendesk subdomain, account email, API token and webhook signing secret.');await connect(db,config,c.get('operator'),input.data);return c.json({connected:true});});
 app.post('/disconnect',async c=>{await disconnect(db,c.get('operator'));return c.json({disconnected:true});});
 return app;
}
export function zendeskSupportRoutes(db:D1Database,config:SupportConfig){const app=new Hono<Env>();errors(app);
 app.use('*',async(c,next)=>{await requireActor(db,c.get('operator'));await next();});
 app.get('/companies/:id',async c=>{if(!id.safeParse(c.req.param('id')).success)throw new SupportError(404,'Company not found.');return c.json({...await tickets(db,config,c.get('operator'),c.req.param('id')),ownership});});
 app.post('/companies/:id/mapping-preview',async c=>{const input=z.object({organizationId:orgId}).strict().safeParse(await c.req.json());if(!input.success)throw new SupportError(400,'Enter a Zendesk organization ID.');const {connection,...plan}=await mappingPlan(db,config,c.get('operator'),c.req.param('id'),input.data.organizationId);return c.json(plan);});
 app.put('/companies/:id/mapping',async c=>{const input=z.object({organizationId:orgId,digest,confirmed:z.literal(true)}).strict().safeParse(await c.req.json());if(!input.success)throw new SupportError(400,'Preview and confirm the exact organization mapping.');await saveMapping(db,config,c.get('operator'),c.req.param('id'),input.data);return c.json({mapped:true});});
 app.post('/companies/:id/handoff-preview',async c=>{const input=context.strict().safeParse(await c.req.json());if(!input.success)throw new SupportError(400,'Choose and review the ticket title and record context.');const {digest,ticket,fields,contactId}=await handoffPlan(db,config,c.get('operator'),c.req.param('id'),input.data);return c.json({digest,ticket,fields,contactId,ownership});});
 app.post('/companies/:id/handoffs',async c=>{const input=context.extend({digest,operationId:z.uuid(),confirmed:z.literal(true)}).strict().safeParse(await c.req.json());if(!input.success)throw new SupportError(400,'Confirm the exact previewed handoff.');return c.json(await handoff(db,config,c.get('operator'),c.req.param('id'),input.data));});
 return app;
}
