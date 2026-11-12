import {Hono} from 'hono';
import type {AuthenticatedOperator} from '../identity';
import {WorkbenchError} from '../workbench/repository';
import {SequenceRepository} from './repository';
import {sequenceId,sequenceContent,sequenceEdit,sequenceShare,sequenceCopy,sequencePreview} from './schema';

function validId(value:string){
 if(!sequenceId.safeParse(value).success)throw new WorkbenchError(400,'Choose a valid sequence.');
 return value;
}

export function createSequenceRoutes(db:D1Database){
 const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>(),repository=new SequenceRepository(db);
 app.onError((error,c)=>{
  if(error instanceof WorkbenchError)return c.json({error:error.message},error.status);
  if(error instanceof SyntaxError)return c.json({error:'Enter a valid JSON request.'},400);
  throw error;
 });
 app.use('*',async(c,next)=>{await repository.access(c.get('operator').operatorId);await next();});
 app.get('/',async c=>c.json(await repository.list(c.get('operator').operatorId)));
 app.get('/:id',async c=>c.json(await repository.read(validId(c.req.param('id')),c.get('operator').operatorId)));
 app.post('/',async c=>{
  const input=sequenceContent.safeParse(await c.req.json());
  if(!input.success)return c.json({error:'Enter a name and supported steps with conditions, business-day delays and the required content.'},400);
  return c.json(await repository.create(c.get('operator').operatorId,input.data),201);
 });
 app.put('/:id',async c=>{
  const input=sequenceEdit.safeParse(await c.req.json());
  if(!input.success)return c.json({error:'Enter supported sequence content and its current version.'},400);
  return c.json(await repository.edit(validId(c.req.param('id')),c.get('operator').operatorId,input.data));
 });
 app.post('/:id/share',async c=>{
  const input=sequenceShare.safeParse(await c.req.json());
  if(!input.success)return c.json({error:'Choose private or workspace visibility and the current sequence version.'},400);
  return c.json(await repository.share(validId(c.req.param('id')),c.get('operator').operatorId,input.data));
 });
 app.post('/:id/copy',async c=>{
  const input=sequenceCopy.safeParse(await c.req.json());
  if(!input.success)return c.json({error:'Enter the copy name and current source version.'},400);
  return c.json(await repository.copy(validId(c.req.param('id')),c.get('operator').operatorId,input.data),201);
 });
 app.post('/:id/preview',async c=>{
  const input=sequencePreview.safeParse(await c.req.json());
  if(!input.success)return c.json({error:'Choose an ISO startAt time including its timezone offset.'},400);
  return c.json(await repository.preview(validId(c.req.param('id')),c.get('operator').operatorId,input.data.startAt));
 });
 return app;
}
