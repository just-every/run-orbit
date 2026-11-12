import {calendarWritebackRoutes} from './writeback';
import {Hono} from 'hono';
import {z} from 'zod';
import type {AuthenticatedOperator} from '../../identity';
import type {SourceSecurity} from '../../../platform/source-security';
import {CaptureError,CaptureProviderError} from '../contracts';
import {defaultProviderFetch,providerId,redirectUri,trustedOrigin,type ProviderFetch} from './config';
import {startOAuth,finishOAuth} from './oauth';
import {providerOptions,selectScope,syncProvider} from './service';
import {syncLinkedCalendar} from '../calendar-link/routes';
const ids=z.array(z.string().min(1).max(512).refine(id=>!/[\x00-\x1f]/.test(id))).max(500).transform(ids=>[...new Set(ids)]);
const instant=z.string().datetime({offset:true}).transform(value=>new Date(value).toISOString());
const scopeSchema=z.object({mail:z.object({folders:ids}).optional(),calendars:ids.optional(),calendarWindow:z.object({start:instant,end:instant}).refine(window=>Date.parse(window.end)>Date.parse(window.start)&&Date.parse(window.end)-Date.parse(window.start)<=10*366*86400000,'Choose increasing dates within ten years.').optional()}).strict().refine(scope=>(scope.mail?.folders.length??0)+(scope.calendars?.length??0)>0,'Choose at least one label, folder or calendar.');
export interface ProviderConfig{security?:SourceSecurity;origin?:string;fetcher?:ProviderFetch;mailAddress?:string;local?:boolean}
export function createProviderRoutes(db:D1Database,config:ProviderConfig){
 const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>(),fetcher=config.fetcher??defaultProviderFetch;
 const security=()=>{if(!config.security)throw new CaptureError(503,'Provider connections need ORBIT_ENCRYPTION_KEY.');return config.security;};
 app.onError((error,c)=>{
  const message=error instanceof CaptureError?error.message:error instanceof CaptureProviderError?'The provider connection could not finish. Check its status and try again.':'The provider connection could not finish.';
  const status=error instanceof CaptureError?error.status:error instanceof CaptureProviderError?503:500;
  const provider=/\/oauth\/(google|microsoft)\//.exec(c.req.path)?.[1],page=provider?`/app/settings/capture/connect/${provider}?step=5&`:'/app/settings/capture?';
  return (c.req.header('accept')??'').includes('text/html')?c.redirect(`${page}error=${encodeURIComponent(message)}`,303):c.json({error:message},status);
 });
 app.route('/writeback',calendarWritebackRoutes(db,{...config,fetcher}));
 app.get('/sources/:id/send-authorization',async c=>{
  const row=await db.prepare("SELECT a.mailbox_address AS address,a.state,a.retry_at AS retryAt,(a.connection_id=c.connection_id AND c.state IN('connected','syncing') AND EXISTS(SELECT 1 FROM capture_credentials WHERE source_id=c.id)) AS current FROM mailbox_send_authorizations a JOIN capture_sources c ON c.id=a.source_id WHERE a.source_id=? AND a.operator_id=?").bind(c.req.param('id'),c.get('operator').operatorId).first();
  return c.json({authorization:row??null});
 });
 app.post('/sources/:id/revoke-send',async c=>{
  const actor=c.get('operator').operatorId,id=c.req.param('id'),at=new Date().toISOString();
  const results=await db.batch([db.prepare("UPDATE mailbox_send_authorizations SET state='paused' WHERE source_id=? AND operator_id=? AND state='authorized'").bind(id,actor),db.prepare("DELETE FROM capture_oauth WHERE source_id=? AND operator_id=?").bind(id,actor),db.prepare("INSERT INTO audit_entries(id,actor_id,action,entity_type,entity_id,details_json,occurred_at) VALUES(?,?,'mailbox.send.revoked','capture_source',?,'{}',?)").bind(crypto.randomUUID(),actor,id,at)]);
  if(!results[0]!.meta.changes)throw new CaptureError(409,'No active send authorization belongs to you on this source.');
  return c.json({revoked:true});
 });
 app.get('/providers',c=>{
  const origin=trustedOrigin(config.origin,c.req.url);
  return c.json({available:Boolean(config.security),providers:([{id:'google',name:'Google Gmail and Calendar'},{id:'microsoft',name:'Microsoft mail and calendar'}] as const).map(provider=>({...provider,redirectUri:redirectUri(origin,provider.id)}))});
 });
 app.post('/oauth/:provider/start',async c=>{
  const form=!(c.req.header('content-type')??'').includes('application/json');
  const input=form?Object.fromEntries(await c.req.formData()):await c.req.json();
  const result=await startOAuth(db,security(),providerId(c.req.param('provider')),trustedOrigin(config.origin,c.req.url),c.get('operator'),input);
  return form?c.redirect(result.authorizationUrl,303):c.json(result);
 });
 app.get('/oauth/:provider/callback',async c=>{
  try{const id=await finishOAuth(db,security(),providerId(c.req.param('provider')),trustedOrigin(config.origin,c.req.url),c.get('operator'),c.req.query(),fetcher);return c.redirect(`/app/settings/capture/connect/${c.req.param('provider')}?step=6&connected=${encodeURIComponent(id)}`,303);}
  catch(error){const message=error instanceof CaptureError?error.message:'The provider did not complete the connection. Start again.';return c.redirect(`/app/settings/capture/connect/${providerId(c.req.param('provider'))}?step=5&error=${encodeURIComponent(message)}`,303);}
 });
 app.get('/sources/:id/options',async c=>{
  const continuation=c.req.query('continuation');if(continuation&&continuation.length>100000)throw new CaptureError(400,'Invalid metadata continuation.');
  return c.json(await providerOptions(db,c.req.param('id'),security(),fetcher,continuation));
 });
 app.post('/sources/:id/scope',async c=>{
  const form=!(c.req.header('content-type')??'').includes('application/json');let body:unknown;
  if(form){const data=await c.req.formData();body={mail:{folders:data.getAll('folders')},calendars:data.getAll('calendars'),...(data.get('calendarStart')&&data.get('calendarEnd')?{calendarWindow:{start:`${data.get('calendarStart')}T00:00:00.000Z`,end:`${data.get('calendarEnd')}T00:00:00.000Z`}}:{})};}else body=await c.req.json();
  const parsed=scopeSchema.safeParse(body);if(!parsed.success)throw new CaptureError(400,'Choose valid labels, folders and calendars, with an increasing calendar window of at most ten years.');
  const result=await selectScope(db,c.req.param('id'),parsed.data,security(),fetcher,c.get('operator'));return form?c.redirect(`/app/settings/capture?scopeSaved=${encodeURIComponent(c.req.param('id'))}`,303):c.json(result);
 });
 app.post('/sources/:id/sync',async c=>{
  const id=c.req.param('id'),adapter=await db.prepare('SELECT adapter FROM capture_sources WHERE id=?').bind(id).first<string>('adapter');
  const {more,...summary}=adapter==='ical'?await syncLinkedCalendar(db,id,config.security,fetcher):await syncProvider(db,id,security(),fetcher);
  return (c.req.header('accept')??'').includes('text/html')?c.redirect(`/app/settings/capture?result=${encodeURIComponent(JSON.stringify({...summary,more}))}`,303):c.json({summary,more});
 });
 return app;
}
