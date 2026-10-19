import { followUpOutcomes } from '../outreach/follow-up-outcomes';
import { draftOptOut, markDraftOptOut } from '../outreach/opt-out';
import {senderTestRoutes} from './sender-test';
import {schedulerStatus} from '../outreach/scheduler';
import {deliveryOutcomesStatus,deliveryOutcomesTracked,type DeliveryOutcomeKeys} from '../outreach/delivery-outcomes';
import {onboardingState} from './onboarding';
import { confirmDraftReview } from '../outreach/review-repository';
import { evaluateOpportunity } from './evaluation-repository';
import { completeAction } from './action-repository';
import { ApprovalRepository } from '../outreach/approval-repository';
import { OutreachService } from '../outreach/service';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthenticatedOperator } from '../identity';
import type { CustomerMailStatus, OutboundMail } from '../../platform/outbound-mail';
import { submissionOutcome } from '../../platform/outbound-mail';
import { WorkbenchRepository, WorkbenchError } from './repository';
import { OutreachRepository } from './outreach-repository';
import { weights } from './policies';
import {logUnexpected} from '../../platform/unexpected-error';
const id=z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
const createSchema=z.object({title:z.string().trim().min(1).max(200),companyName:z.string().trim().min(1).max(200),contactName:z.string().trim().min(1).max(200),email:z.string().trim().email(),stageId:id,valueCents:z.number().int().min(0).max(100000000000)});
export function createWorkbenchRoutes(database: D1Database, mail?: OutboundMail, aiConfigured=false, hosted=false, mailEvents:DeliveryOutcomeKeys={}, origin='', mailSettings?:CustomerMailStatus) {
  const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>(), repository=new WorkbenchRepository(database), outreach=new OutreachRepository(database);
  app.use('*',async(c,next)=>{const segments=c.req.path.split('/');for(const category of ['opportunities','drafts','recommendations','messages']){const index=segments.indexOf(category);if(index>=0&&segments[index+1]&&!id.safeParse(segments[index+1]).success)return c.json({error:'Invalid record ID.'},400);}await next();});
  app.onError((error,context)=>{if(error instanceof WorkbenchError)return context.json({error:error.message,recordId:error.recordId},error.status);logUnexpected('workbench',error);return context.json({error:'The operation failed; no success was confirmed.'},500);});
  app.route('/sender-test',senderTestRoutes(database,mail));
  app.get('/delivery-outcomes',async c=>c.json(await deliveryOutcomesStatus(database,mailEvents,hosted,origin)));
  app.get('/onboarding',async c=>c.json({...await onboardingState(database,Boolean(mail),aiConfigured),mailSettings:mailSettings??null}));
  app.get('/',async context=>context.json({...await repository.inventory(),mailConfigured:Boolean(mail)}));
  app.post('/opportunities',async context=>{
    const input=createSchema.safeParse(await context.req.json());if(!input.success)return context.json({error:'Enter valid company, contact, stage and opportunity details.'},400);
    return context.json(await repository.createOpportunity(input.data,context.get('operator').operatorId),201);
  });
  app.post('/opportunities/:id/events',async context=>{
    const input=z.object({type:z.string().refine(type=>Object.hasOwn(weights,type)),subject:z.string().trim().min(1).max(2000),occurredAt:z.iso.datetime(),eventId:z.string().min(1).max(128),contactId:id.optional(),permanentBounce:z.boolean().optional()}).safeParse(await context.req.json());
    if(!input.success||Date.parse(input.data.occurredAt)>Date.now())return context.json({error:'Enter a supported customer event and an occurred time no later than now.'},400);
    return context.json(await repository.recordEvent(context.req.param('id'),input.data,context.get('operator').operatorId),201);
  });
  app.post('/opportunities/:id/drafts',async context=>{
    const input=z.object({contactId:id,subject:z.string().trim().min(1).max(998),body:z.string().trim().min(1).max(100000)}).safeParse(await context.req.json());if(!input.success)return context.json({error:'Choose a recipient and enter a subject and message.'},400);
    return context.json(await outreach.createDraft(context.req.param('id'),input.data,context.get('operator').operatorId),201);
  });
  app.get('/opportunities/:id/messages',async context=>context.json({messages:await outreach.messages(context.req.param('id')),outcomes:await followUpOutcomes(database,context.req.param('id')),mailProvider:mail?.provider??'sendgrid',scheduler:hosted?await schedulerStatus(database):null,outcomesTracked:deliveryOutcomesTracked(mailEvents)}));
  app.post('/opportunities/:id/recommendation',async c=>{await evaluateOpportunity(database,c.req.param('id'),c.get('operator').operatorId,'Operator requested a new recommendation');return c.json({refreshed:true});});
  app.post('/recommendations/:id/complete',async c=>{const input=z.object({outcome:z.enum(['completed','skipped']),note:z.string().max(5000).default('')}).safeParse(await c.req.json());if(!input.success)return c.json({error:'Choose completed or skipped and an optional note.'},400);await completeAction(database,c.req.param('id'),c.get('operator').operatorId,input.data.outcome,input.data.note);return c.json({completed:true});});
  app.post('/drafts/:id/review',async c=>{const input=z.object({revision:z.number().int().positive(),reviewedUpdatedAt:z.iso.datetime(),recipientContactId:id,recipientEmail:z.email(),subject:z.string().min(1).max(998),body:z.string().min(1).max(100000)}).safeParse(await c.req.json());if(!input.success)return c.json({error:'Review the latest changed draft and its exact recipient and content.'},400);return c.json(await confirmDraftReview(database,c.req.param('id'),c.get('operator').operatorId,input.data));});
  app.get('/drafts/:id/approval-preview',async context=>{
    if(!mail)return context.json({error:'Configure customer mail in Settings → Customer mail sender before approving or scheduling a message.'},503);
    const input=z.object({scheduledAt:z.iso.datetime().optional()}).safeParse(context.req.query());
    if(!input.success)return context.json({error:'Choose a valid schedule time.'},400);
    return context.json(await new ApprovalRepository(database).preview(context.req.param('id'),new Date(),input.data.scheduledAt));
  });
  app.post('/messages/:id/retry',async c=>{if(!mail)return c.json({error:'Mail provider is required.'},503);const input=z.object({quietHoursConfirmation:z.string().optional()}).strict().safeParse(await c.req.json());if(!input.success)return c.json({error:'Invalid retry confirmation.'},400);const message=await new ApprovalRepository(database).retryBlocked(c.req.param('id'),c.get('operator').operatorId,input.data.quietHoursConfirmation);return c.json(await new OutreachService(database,mail).submit(message));});
  app.get('/drafts/:id/opt-out',async c=>c.json(await draftOptOut(database,c.req.param('id'),mail?.provider!=='rer')));
  app.post('/drafts/:id/opt-out',async c=>{const input=z.object({choice:z.enum(['relationship','transactional','added']).nullable()}).strict().safeParse(await c.req.json());if(!input.success)return c.json({error:'Choose relationship or transactional mail, add opt-out, or clear the marking.'},400);await markDraftOptOut(database,c.req.param('id'),c.get('operator').operatorId,input.data.choice);return c.json(await draftOptOut(database,c.req.param('id'),mail?.provider!=='rer'));});
  app.post('/messages/:id/cancel',async context=>{await new ApprovalRepository(database).cancel(context.req.param('id'),context.get('operator').operatorId);return context.json({cancelled:true});});
  app.post('/drafts/:id/approve',async context=>{
    if(!mail)return context.json({error:'Configure mail delivery before approving customer mail.'},503);
    const input=z.object({revision:z.number().int().positive(),idempotencyKey:z.string().min(1).max(128).optional(),scheduledAt:z.iso.datetime().optional(),scheduledAtConfirmation:z.iso.datetime().optional(),quietHoursConfirmation:z.string().max(200).optional(),optOut:z.boolean().optional()}).safeParse(await context.req.json());if(!input.success)return context.json({error:'An exact draft revision and valid approval options are required.'},400);
    const {optOut,...approval}=input.data,actor=context.get('operator').operatorId,message=await outreach.claim(context.req.param('id'),input.data.revision,actor,{...approval,messageIdDomain:mail.messageIdDomain,optOutTransport:mail.provider!=='rer',optOutExpected:optOut});
    if(message.state==='draft')return context.json({id:message.id,state:'draft',error:message.failure,retryAfter:message.next_attempt_at},409);
    if(message.state==='scheduled')return context.json({id:message.id,state:'scheduled',scheduledAt:message.scheduled_at});
    const result=await new OutreachService(database,mail).submit(message);return context.json(result,result.state==='accepted'?200:502);
  });
  return app;
}
