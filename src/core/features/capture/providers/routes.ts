import {Hono} from 'hono';
import {z} from 'zod';
import type {AuthenticatedOperator} from '../../identity';
import type {SourceSecurity} from '../../../platform/source-security';
import {CaptureError,CaptureProviderError} from '../contracts';
import {providerId,redirectUri,trustedOrigin,type ProviderFetch} from './config';
import {startOAuth,finishOAuth} from './oauth';
import {providerOptions,selectScope,syncProvider} from './service';
const ids=z.array(z.string().min(1).max(512).refine(id=>!/[\x00-\x1f]/.test(id))).max(500).transform(ids=>[...new Set(ids)]);
const instant=z.string().datetime({offset:true}).transform(value=>new Date(value).toISOString());
const scopeSchema=z.object({mail:z.object({folders:ids}).optional(),calendars:ids.optional(),calendarWindow:z.object({start:instant,end:instant}).refine(window=>Date.parse(window.end)>Date.parse(window.start)&&Date.parse(window.end)-Date.parse(window.start)<=10*366*86400000,'Choose increasing dates within ten years.').optional()}).strict().refine(scope=>(scope.mail?.folders.length??0)+(scope.calendars?.length??0)>0,'Choose at least one label, folder or calendar.');
export interface ProviderConfig{security?:SourceSecurity;origin?:string;fetcher?:ProviderFetch}
export function createProviderRoutes(db:D1Database,config:ProviderConfig){
 const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>(),fetcher=config.fetcher??fetch;
 const security=()=>{if(!config.security)throw new CaptureError(503,'Provider connections need ORBIT_ENCRYPTION_KEY.');return config.security;};
 app.onError((error,c)=>{
  const message=error instanceof CaptureError?error.message:error instanceof CaptureProviderError?'The provider connection could not finish. Check its status and try again.':'The provider connection could not finish.';
  const status=error instanceof CaptureError?error.status:error instanceof CaptureProviderError?503:500;
  return (c.req.header('accept')??'').includes('text/html')?c.redirect(`/app/capture?error=${encodeURIComponent(message)}`,303):c.json({error:message},status);
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
  try{const id=await finishOAuth(db,security(),providerId(c.req.param('provider')),trustedOrigin(config.origin,c.req.url),c.get('operator'),c.req.query(),fetcher);return c.redirect(`/app/capture?connected=${encodeURIComponent(id)}`,303);}
  catch(error){const message=error instanceof CaptureError?error.message:'The provider did not complete the connection. Start again.';return c.redirect(`/app/capture?error=${encodeURIComponent(message)}`,303);}
 });
 app.get('/sources/:id/options',async c=>{
  const continuation=c.req.query('continuation');if(continuation&&continuation.length>100000)throw new CaptureError(400,'Invalid metadata continuation.');
  return c.json(await providerOptions(db,c.req.param('id'),security(),fetcher,continuation));
 });
 app.post('/sources/:id/scope',async c=>{
  const form=!(c.req.header('content-type')??'').includes('application/json');let body:unknown;
  if(form){const data=await c.req.formData();body={mail:{folders:data.getAll('folders')},calendars:data.getAll('calendars'),...(data.get('calendarStart')&&data.get('calendarEnd')?{calendarWindow:{start:`${data.get('calendarStart')}T00:00:00.000Z`,end:`${data.get('calendarEnd')}T00:00:00.000Z`}}:{})};}else body=await c.req.json();
  const parsed=scopeSchema.safeParse(body);if(!parsed.success)throw new CaptureError(400,'Choose valid labels, folders and calendars, with an increasing calendar window of at most ten years.');
  const result=await selectScope(db,c.req.param('id'),parsed.data,security(),fetcher,c.get('operator'));return form?c.redirect(`/app/capture?scopeSaved=${encodeURIComponent(c.req.param('id'))}`,303):c.json(result);
 });
 app.post('/sources/:id/sync',async c=>{
  const {more,...summary}=await syncProvider(db,c.req.param('id'),security(),fetcher);
  return (c.req.header('accept')??'').includes('text/html')?c.redirect(`/app/capture?result=${encodeURIComponent(JSON.stringify({...summary,more}))}`,303):c.json({summary,more});
 });
 return app;
}
