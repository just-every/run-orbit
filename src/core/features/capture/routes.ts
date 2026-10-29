import {AccessService} from '../access/service';
import {createProviderRoutes,type ProviderConfig} from './providers/routes';
import {Hono,type Context} from 'hono';
import {z} from 'zod';
import type {AuthenticatedOperator} from '../identity';
import {audit} from '../records/shared';
import {CaptureError} from './contracts';
import {fileAdapter,fileItems} from './file-source';
import {acceptProposal,declineProposal,listProposals} from './proposals';
import {captureItems,disconnectSource,ensureFileSource,listSources} from './sources';
import {createForwardRoutes} from './forward/routes';
import {createCalendarLinkRoutes} from './calendar-link/routes';
import {mailRuleSettings,saveMailRule} from './mail-rule';
import {correctDealLinks,readDealLinks} from './deal-links';

/** Capture is an operator action: these routes sit behind the operator session, never a source signature (SIGNAL-009). */
export function createCaptureRoutes(db:D1Database,providers:ProviderConfig={}){
 const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>(),recordId=z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
 app.onError((error,c)=>error instanceof CaptureError?c.json({error:error.message},error.status):c.json({error:'Capture failed; nothing was confirmed.'},500));
 app.get('/mail-rule',async c=>c.json(await mailRuleSettings(db,c.get('operator'))));
 app.put('/mail-rule',async c=>{
  const input=z.object({rule:z.enum(['review','recent','all'])}).strict().safeParse(await c.req.json().catch(()=>null));
  if(!input.success)throw new CaptureError(400,'Choose a connected mail association rule.');
  return c.json(await saveMailRule(db,c.get('operator'),input.data.rule));
 });
 app.get('/signals/:id/deal-links',async c=>{
  if(!recordId.safeParse(c.req.param('id')).success)throw new CaptureError(400,'Invalid captured signal ID.');
  return c.json(await readDealLinks(db,c.req.param('id'),c.get('operator')));
 });
 app.post('/signals/:id/deal-links',async c=>{
  if(!recordId.safeParse(c.req.param('id')).success)throw new CaptureError(400,'Invalid captured signal ID.');
  const input=z.object({opportunityId:recordId.nullable(),requestId:z.uuid(),revision:z.string().regex(/^[a-f0-9]{64}$/)}).strict().safeParse(await c.req.json().catch(()=>null));
  if(!input.success)throw new CaptureError(400,'Review a deal or remove the deal associations.');
  return c.json(await correctDealLinks(db,c.req.param('id'),c.get('operator'),input.data.opportunityId,input.data.requestId,input.data.revision));
 });
 app.post('/imports',async c=>{
  // A form posted before hydration gets the Capture page back with its result; scripts get JSON.
  const page=(c.req.header('accept')??'').includes('text/html');
  try{return await importFiles(c,page);}
  catch(error){if(!page||!(error instanceof CaptureError))throw error;return c.redirect(`/app/settings/capture/connect/files?error=${encodeURIComponent(error.message)}`,303);}
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
  return page?c.redirect(`/app/settings/capture/connect/files?result=${encodeURIComponent(JSON.stringify(summary))}`,303):c.json({summary},201);
 }
 app.route('/',createProviderRoutes(db,providers));
 app.route('/forward',createForwardRoutes(db,{security:providers.security,address:providers.mailAddress,local:providers.local}));
 app.route('/calendar-links',createCalendarLinkRoutes(db,{security:providers.security,fetcher:providers.fetcher}));
 app.get('/sources',async c=>c.json({sources:await listSources(db)}));
 app.post('/sources/:id/disconnect',async c=>{
  const form=!(c.req.header('content-type')??'').includes('application/json');
  const confirmed=form?(await c.req.formData()).get('confirmed')==='true':(await c.req.json().catch(()=>({}))).confirmed===true;
  if(!confirmed)throw new CaptureError(400,'Confirm disconnecting this source.');
  const operator=c.get('operator'),access=new AccessService(db),actor=await access.authorizeLegacy(operator,crypto.randomUUID(),'legacy.write');
  const result=await disconnectSource(db,c.req.param('id'),operator.operatorId,access.fence(actor).map(statement=>db.prepare(statement.sql).bind(...statement.bindings)));
  return form?c.redirect('/app/settings/capture',303):c.json(result);
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
