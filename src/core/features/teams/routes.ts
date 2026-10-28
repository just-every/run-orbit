import {Hono} from 'hono';
import {z} from 'zod';
import type {AuthenticatedOperator} from '../identity';
import {RecordError} from '../records/shared';
import {logUnexpected} from '../../platform/unexpected-error';
import {createId} from '../../shared/ids';
import {identifier,membersSchema,profileSchema,shareSchema,teamSchema} from './contracts';
import {TeamsRepository} from './repository';
/** Mount behind native authentication at /api/v1/settings/teams. */
export function createTeamRoutes(db:D1Database){
 const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>(),repo=new TeamsRepository(db);
 app.onError((error,c)=>{
  if(error instanceof RecordError)return c.json({error:error.message},error.status);
  if(error instanceof z.ZodError||error instanceof SyntaxError)return c.json({error:'Enter valid sales access settings.'},400);
  logUnexpected('sales-teams',error);return c.json({error:'Sales access settings could not be updated.'},500);
 });
 app.use('*',async(c,next)=>{c.header('Cache-Control','no-store');const actor=c.get('operator');if(!actor)return c.json({error:'Operator session required.'},401);await repo.admin(actor);await next();});
 app.get('/',async c=>c.json(await repo.describe(c.get('operator'))));
 app.get('/records',async c=>c.json({records:await repo.records(c.get('operator'),z.string().max(200).parse(c.req.query('q')??''))}));
 app.put('/records/:kind/:id/visibility',async c=>{const input=z.object({visibility:z.enum(['workspace','restricted'])}).strict().parse(await c.req.json());await repo.setVisibility(c.get('operator'),identifier.parse(c.req.param('kind')),identifier.parse(c.req.param('id')),input.visibility);return c.json({saved:true});});
 app.put('/roles/:id',async c=>{await repo.setRole(c.get('operator'),identifier.parse(c.req.param('id')),profileSchema.parse(await c.req.json()));return c.json({saved:true});});
 app.post('/',async c=>{const id=createId();await repo.setTeam(c.get('operator'),id,teamSchema.parse(await c.req.json()),true);return c.json({id},201);});
 app.put('/:id',async c=>{await repo.setTeam(c.get('operator'),identifier.parse(c.req.param('id')),teamSchema.parse(await c.req.json()));return c.json({saved:true});});
 app.put('/:id/members',async c=>{await repo.setMembers(c.get('operator'),identifier.parse(c.req.param('id')),membersSchema.parse(await c.req.json()).operatorIds);return c.json({saved:true});});
 app.post('/shares',async c=>{const id=createId();await repo.share(c.get('operator'),id,shareSchema.parse(await c.req.json()));return c.json({id},201);});
 app.put('/shares/:id',async c=>{await repo.share(c.get('operator'),identifier.parse(c.req.param('id')),shareSchema.parse(await c.req.json()));return c.json({saved:true});});
 app.delete('/shares/:id',async c=>{await repo.revoke(c.get('operator'),identifier.parse(c.req.param('id')));return c.json({saved:true});});
 return app;
}
