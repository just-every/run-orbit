import {Hono} from 'hono';
import {z} from 'zod';
import type {AuthenticatedOperator} from '../identity';
import {trustedOrigin} from '../capture/providers/config';
import {isFullOperator} from '../access/identity-class';
import {requireRecord,RecordError} from '../records/shared';
import {handoffFields,MailchimpError,type MailchimpConfig} from './contracts';
import {audiences,check,chooseAudience,connect,connection,disconnect,openSealed,ownership} from './connection';
import {consentStatement,withdrawalStatement} from './ledger';
import {handoff,plan,type PlanItem} from './handoff';
import {MailchimpProviderError,refusalMessage} from './provider';

type Env={Variables:{operator:AuthenticatedOperator}};
const isOwner=async(db:D1Database,id:string)=>Boolean(await db.prepare("SELECT 1 FROM operators WHERE id=? AND setup_owner=1 AND status='active'").bind(id).first());
function errors(app:Hono<Env>){app.onError((error,c)=>{if(error instanceof MailchimpError||error instanceof RecordError)return c.json({error:error.message},error.status);if(error instanceof MailchimpProviderError)return c.json({error:refusalMessage(error)},error.refused?409:502);return c.json({error:'The Mailchimp request failed. Check the Mailchimp settings and try again.'},500);});}
function fieldList(value:string|undefined){const parsed=z.array(z.enum(handoffFields)).max(handoffFields.length).safeParse((value??'').split(',').filter(Boolean));if(!parsed.success)throw new MailchimpError(400,'Choose the fields to hand off from name and phone.');return parsed.data;}
async function connected(db:D1Database){const status=await connection(db);if(status.state!=='connected'||!status.settings?.audience)throw new MailchimpError(409,`Mailchimp is unresolved setup. ${status.reason}`);return status.settings;}

/** INTEGRATE-007 connection: the installation owner connects with an API key and chooses one audience; everyone sees the real state. */
export function mailchimpSettingsRoutes(db:D1Database,config:MailchimpConfig){
 const app=new Hono<Env>();errors(app);
 app.get('/',async c=>{
  const owner=await isOwner(db,c.get('operator').operatorId),status=await connection(db),settings=status.settings;
  const webhookUrl=owner&&status.held&&settings?.audience?`${trustedOrigin(config.origin??new URL(c.req.url).origin,c.req.url)}/api/v1/signals/mailchimp/${(await openSealed(db,config)).webhookToken}`:null;
  return c.json({state:status.state,reason:status.reason,held:status.held,owner,ownership,audience:settings?.audience?{name:settings.audience.name,link:status.link}:null,checkedAt:settings?.checkedAt??null,webhookCheckedAt:settings?.webhookCheckedAt??null,lastEventAt:status.lastEventAt,webhookUrl,fields:handoffFields.filter(field=>field==='name'?settings?.mergeTags.includes('FNAME'):settings?.mergeTags.includes('PHONE'))});
 });
 app.use('*',async(c,next)=>{if(!await isOwner(db,c.get('operator').operatorId))throw new MailchimpError(403,'Only the installation owner connects Mailchimp until TEAM-005.');await next();});
 app.post('/connect',async c=>{const input=z.object({apiKey:z.string().min(10).max(100)}).strict().safeParse(await c.req.json());if(!input.success)throw new MailchimpError(400,'Enter the Mailchimp API key.');await connect(db,config,input.data.apiKey,c.get('operator').operatorId);return c.json({connected:true});});
 app.post('/check',async c=>{await check(db,config,c.get('operator').operatorId);return c.json({checked:true});});
 app.get('/audiences',async c=>c.json({audiences:await audiences(db,config)}));
 app.put('/audience',async c=>{const input=z.object({audienceId:z.string().min(1).max(32)}).strict().safeParse(await c.req.json());if(!input.success)throw new MailchimpError(400,'Choose a Mailchimp audience.');return c.json({audience:await chooseAudience(db,config,input.data.audienceId,c.get('operator').operatorId)});});
 app.post('/disconnect',async c=>{await disconnect(db,c.get('operator').operatorId);return c.json({disconnected:true});});
 return app;
}

const view=(item:PlanItem)=>({contactId:item.contactId,name:item.name,email:item.email,company:item.company,reason:item.reason,consent:item.consent,action:item.action,memberStatus:item.member?.status??null});
/** Sales users preview the audience, record consent they hold, and hand off exactly what they previewed. */
export function mailchimpHandoffRoutes(db:D1Database,config:MailchimpConfig){
 const app=new Hono<Env>();errors(app);
 app.use('*',async(c,next)=>{if(!await isFullOperator(db,c.get('operator').operatorId))throw new MailchimpError(403,'Only full Orbit operators hand contacts to Mailchimp.');await next();});
 app.get('/preview',async c=>{
  const settings=await connected(db),result=await plan(db,settings,fieldList(c.req.query('fields'))),group=(name:string)=>result.items.filter(item=>item.group===name);
  const count=(action:string)=>result.items.filter(item=>item.action===action).length;
  return c.json({audience:{name:result.audience.name},fields:result.fields,ownership,digest:result.digest,counts:{subscribed:group('subscribed').length,unknown:group('unknown').length,stopped:group('stopped').length,send:count('send'),unchanged:count('unchanged'),unsubscribe:count('unsubscribe'),check:count('check')},groups:{subscribed:group('subscribed').slice(0,200).map(view),unknown:group('unknown').slice(0,200).map(view),stopped:group('stopped').slice(0,200).map(view)}});
 });
 app.post('/handoffs',async c=>{
  const input=z.object({fields:z.array(z.enum(handoffFields)).max(handoffFields.length),previewDigest:z.string().regex(/^[a-f0-9]{64}$/),operationId:z.uuid()}).strict().safeParse(await c.req.json());
  if(!input.success)throw new MailchimpError(400,'Preview the handoff, then hand off what you reviewed.');
  const settings=await connected(db),{apiKey}=await openSealed(db,config);
  return c.json(await handoff(db,config,apiKey,settings,c.get('operator').operatorId,input.data));
 });
 app.post('/consents/:contactId',async c=>{
  const input=z.object({source:z.string().trim().min(2).max(120),basis:z.string().trim().min(2).max(300),confirmed:z.literal(true)}).strict().safeParse(await c.req.json());
  if(!input.success)throw new MailchimpError(400,'Say where the person agreed and what they agreed to, and confirm you hold this consent.');
  const contact=await requireRecord(db,'contact',c.req.param('contactId'));
  await consentStatement(db,c.get('operator').operatorId,contact.id,input.data.source,input.data.basis).run();return c.json({recorded:true});
 });
 app.post('/consents/:contactId/withdraw',async c=>{
  const input=z.object({confirmed:z.literal(true)}).strict().safeParse(await c.req.json());if(!input.success)throw new MailchimpError(400,'Confirm the withdrawal.');
  const contact=await requireRecord(db,'contact',c.req.param('contactId'));
  await withdrawalStatement(db,c.get('operator').operatorId,contact.id,'Orbit','Withdrawn by an operator').run();return c.json({withdrawn:true});
 });
 return app;
}
