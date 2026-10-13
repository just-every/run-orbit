import {Hono,type Context} from 'hono';
import {z} from 'zod';
import type {AuthenticatedOperator} from '../identity';
import {audit} from '../records/shared';
import {CaptureError} from './contracts';
import {fileAdapter,fileItems} from './file-source';
import {acceptProposal,declineProposal,listProposals} from './proposals';
import {captureItems,disconnectSource,ensureFileSource,listSources} from './sources';

/** Capture is an operator action: these routes sit behind the operator session, never a source signature (SIGNAL-009). */
export function createCaptureRoutes(db:D1Database){
 const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>(),recordId=z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
 app.onError((error,c)=>error instanceof CaptureError?c.json({error:error.message},error.status):c.json({error:'Capture failed; nothing was confirmed.'},500));
 app.post('/imports',async c=>{
  // A form posted before hydration gets the Capture page back with its result; scripts get JSON.
  const page=(c.req.header('accept')??'').includes('text/html');
  try{return await importFiles(c,page);}
  catch(error){if(!page||!(error instanceof CaptureError))throw error;return c.redirect(`/app/capture?error=${encodeURIComponent(error.message)}`,303);}
 });
 async function importFiles(c:Context<{Variables:{operator:AuthenticatedOperator}}>,page:boolean){
  const form=await c.req.formData().catch(()=>null);if(!form)throw new CaptureError(400,'Add .eml, mbox or .ics files.');
  const files=form.getAll('files').filter((file):file is File=>typeof file!=='string'&&file.size>0);
  if(!files.length)throw new CaptureError(400,'Add .eml, mbox or .ics files.');
  const items=fileItems(await Promise.all(files.map(async file=>({name:file.name,text:new TextDecoder('utf-8').decode(await file.arrayBuffer())}))));
  const source=await ensureFileSource(db),operator=c.get('operator').operatorId,includeUnknown=form.get('includeUnknown')==='on';
  if(source.state==='disconnected')throw new CaptureError(409,'File capture is disconnected.');
  const pulled=await fileAdapter(items).pull(null,null),summary=await captureItems(db,source,pulled.items,{includeUnknown});
  await db.batch([audit(db,operator,'capture.imported','capture_source',source.id,{files:files.length,includeUnknown,...summary})]);
  return page?c.redirect(`/app/capture?result=${encodeURIComponent(JSON.stringify(summary))}`,303):c.json({summary},201);
 }
 app.get('/sources',async c=>c.json({sources:await listSources(db)}));
 app.post('/sources/:id/disconnect',async c=>{
  if((await c.req.json().catch(()=>({}))).confirmed!==true)throw new CaptureError(400,'Confirm disconnecting this source.');
  return c.json(await disconnectSource(db,c.req.param('id'),c.get('operator').operatorId));
 });
 app.get('/proposals',async c=>{
  const query=z.object({status:z.enum(['pending','accepted','declined']).default('pending'),recordType:z.enum(['contact','company','opportunity']).optional(),recordId:recordId.optional()}).strict().safeParse(c.req.query());
  if(!query.success)throw new CaptureError(400,'Invalid proposal filter.');
  return c.json({proposals:await listProposals(db,query.data)});
 });
 app.post('/proposals/:id/accept',async c=>{
  if(!recordId.safeParse(c.req.param('id')).success)throw new CaptureError(400,'Invalid proposal ID.');
  const input=z.object({value:z.string().max(200).optional()}).strict().safeParse(await c.req.json().catch(()=>({})));
  if(!input.success)throw new CaptureError(400,'Enter the value to accept.');
  return c.json(await acceptProposal(db,c.req.param('id'),c.get('operator').operatorId,input.data.value));
 });
 app.post('/proposals/:id/decline',async c=>{
  if(!recordId.safeParse(c.req.param('id')).success)throw new CaptureError(400,'Invalid proposal ID.');
  return c.json(await declineProposal(db,c.req.param('id'),c.get('operator').operatorId));
 });
 return app;
}
