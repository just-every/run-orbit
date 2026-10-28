import {Hono} from 'hono';
import {z} from 'zod';
import type {Clock} from '../../platform/clock';
import type {AuthenticatedOperator} from '../identity';
import {RecordError} from '../records/shared';
import {ApiCredentials,credentialDefinition} from './credentials';

/** Native administration only; issuing a credential grants no session authority. */
export function apiCredentialRoutes(db:D1Database,clock?:Clock){
 const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>(),repo=new ApiCredentials(db,clock),credentialId=z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
 app.onError((error,c)=>error instanceof RecordError?c.json({error:error.message},error.status):c.json({error:'Credential operation failed; no success was confirmed.'},500));
 app.use('*',async(c,next)=>{c.header('Cache-Control','no-store');if(Object.keys(c.req.query()).length)return c.json({error:'Credential administration accepts no query parameters.'},400);await repo.requireAdministrator(c.get('operator').operatorId);await next();});
 app.get('/',async c=>c.json({credentials:await repo.list(c.get('operator').operatorId)}));
 app.post('/',async c=>{
  const input=credentialDefinition.safeParse(await c.req.json());
  if(!input.success)return c.json({error:'Choose a name, active principal, explicit deal operations, records, fields and expiry.'},400);
  return c.json(await repo.issue(c.get('operator'),input.data),201);
 });
 for(const action of ['rotate','revoke'] as const)app.post(`/:id/${action}`,async c=>{
  if(!credentialId.safeParse(c.req.param('id')).success)return c.json({error:'Invalid credential identity.'},400);
  const input=z.object({revision:z.number().int().positive()}).strict().safeParse(await c.req.json());
  if(!input.success)return c.json({error:'Review the current credential revision.'},400);
  return c.json(await repo[action](c.get('operator'),c.req.param('id'),input.data.revision));
 });
 return app;
}
