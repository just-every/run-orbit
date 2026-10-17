import {moveOpportunity} from '../pipelines/movement';
import { clearContactSuppression } from './suppression';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthenticatedOperator } from '../identity';
import { RecordsRepository } from './repository';
import { ImportMergeRepository } from './import-merge';
import { ManualRepository } from './manual';
import { DataRepository } from './data';
import { createArchiveRoutes } from './archive-routes';
import { RecordError, type RecordKind } from './shared';
import {logUnexpected} from '../../platform/unexpected-error';
export function createRecordsRoutes(db:D1Database){const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>(),repo=new RecordsRepository(db),imports=new ImportMergeRepository(db),manual=new ManualRepository(db),data=new DataRepository(db);
 app.onError((e,c)=>{if(e instanceof RecordError)return c.json({error:e.message,recordId:e.recordId},e.status);logUnexpected('records',e);return c.json({error:'Record operation failed; no success was confirmed.'},500);});
 const recordId=z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
 app.use('*',async(c,next)=>{const match=/\/(contact|company|opportunity)\/([^/]+)(?:\/entries\/([^/]+))?/.exec(c.req.path);if(match&&!['duplicates','merge'].includes(match[2])){for(const value of [match[2],match[3]].filter(Boolean)){if(!recordId.safeParse(value).success)return c.json({error:'Invalid record ID.'},400);}}await next();});
 app.route('/archive',createArchiveRoutes(db));
 app.post('/contact/:id/clear-do-not-contact',async c=>{
  const input=z.object({confirmed:z.literal(true),email:z.email().nullable(),updatedAt:z.string().min(1),revision:z.number().int().nonnegative()}).strict().safeParse(await c.req.json());
  if(!input.success)return c.json({error:'Review the current contact and confirm clearing do-not-contact.'},400);
  return c.json(await clearContactSuppression(db,c.req.param('id'),c.get('operator').operatorId,input.data));
 });
 for(const kind of ['contact','company','opportunity'] as RecordKind[]){
  app.get(`/${kind}`,async c=>{const filters=z.object({q:z.string().max(500).optional(),lifecycle:z.enum(['','open','won','lost']).optional(),band:z.enum(['','low','medium','high']).optional(),queue_state:z.enum(['','now','next','none']).optional(),pipeline_id:z.union([recordId,z.literal('')]).optional(),stage_id:z.union([recordId,z.literal('')]).optional(),owner_id:z.union([recordId,z.literal('')]).optional()}).strict().safeParse(c.req.query());if(!filters.success)return c.json({error:'Invalid search or opportunity filters.'},400);return c.json({records:await repo.search(kind,filters.data.q??'',filters.data as Record<string,string>)});});
  app.post(`/${kind}`,async c=>c.json(await repo.save(kind,await c.req.json(),c.get('operator').operatorId,undefined,{ordinaryEdit:true}),201));
  if(kind!=='opportunity'){
   app.get(`/${kind}/duplicates`,async c=>c.json({groups:await imports.candidates(kind)}));
   app.post(`/${kind}/merge`,async c=>{const token=z.string().regex(/^[a-f0-9]{64}$/);const input=z.object({survivorId:recordId,retiredId:recordId,choices:z.record(z.string(),z.enum(['survivor','retired'])),reviewed:z.object({survivor:token,retired:token}).strict(),confirmed:z.literal(true)}).strict().safeParse(await c.req.json());if(!input.success)return c.json({error:'Choose both records, review their current values, resolve conflicts and confirm merge.'},400);return c.json(await imports.merge(kind,input.data.survivorId,input.data.retiredId,input.data.choices,c.get('operator').operatorId,input.data.reviewed));});
  }
  app.get(`/${kind}/:id`,async c=>c.json(await repo.detail(kind,c.req.param('id'))));
  app.put(`/${kind}/:id`,async c=>c.json(await repo.save(kind,await c.req.json(),c.get('operator').operatorId,c.req.param('id'),{ordinaryEdit:true})));
  app.delete(`/${kind}/:id`,async c=>{if((await c.req.json()).confirmed!==true)return c.json({error:'Confirm record deletion.'},400);return c.json(await data.remove(kind,c.req.param('id'),c.get('operator').operatorId,c.get('operator').sessionId));});
  for(const method of ['post','put'] as const)app[method](`/${kind}/:id/entries${method==='put'?'/:entryId':''}`,async c=>{const input=z.object({kind:z.enum(['note','call','meeting']),text:z.string().max(100000),occurredAt:z.iso.datetime(),durationMinutes:z.number().int().min(0).optional(),contactIds:z.array(recordId).max(1000).optional()}).safeParse(await c.req.json());if(!input.success)return c.json({error:'Enter a valid manual entry.'},400);return c.json(await manual.save(kind,c.req.param('id'),input.data,c.get('operator').operatorId,c.req.param('entryId')));});
  app.delete(`/${kind}/:id/entries/:entryId`,async c=>c.json(await manual.remove(kind,c.req.param('id'),c.req.param('entryId'),c.get('operator').operatorId)));
 }
 app.post('/opportunity/:id/move',async c=>{const input=z.object({stageId:recordId,reviewedStageId:recordId}).strict().safeParse(await c.req.json());if(!input.success)return c.json({error:'Review the current stage and choose a destination stage.'},400);return c.json(await moveOpportunity(db,c.req.param('id'),input.data.stageId,input.data.reviewedStageId,c.get('operator').operatorId));});
 app.post('/opportunity/:id/lifecycle',async c=>{const input=z.object({state:z.enum(['open','won','lost']),reason:z.string().max(2000).default('')}).safeParse(await c.req.json());if(!input.success)return c.json({error:'Choose a lifecycle state and closing reason.'},400);return c.json(await repo.lifecycle(c.req.param('id'),input.data.state,input.data.reason,c.get('operator').operatorId));});return app;}
