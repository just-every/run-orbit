import {Hono,type MiddlewareHandler} from 'hono';
import {z,ZodError} from 'zod';
import {FormService} from './service';
import type {FormAbuseOptions} from './abuse';
import {admittedFormOrigin} from './admission';
import {AccessError} from '../access/errors';
import {RecordError} from '../records/shared';
import {boundedRequestBody,RequestBodyTooLarge} from '../../platform/bounded-request-body';
import {consumeRateLimit,publicIdentity} from '../../platform/public-rate-limit';
export function createPublicFormRoutes(db:D1Database,options:FormAbuseOptions={}){
 const app=new Hono(),forms=new FormService(db);
 app.onError(async(error,c)=>{if(error instanceof AccessError&&error.code==='permission'){const now=Date.now(),limited=await consumeRateLimit(db,`public:${await publicIdentity(c.req.raw,now)}`,300,now);if(limited)return limited;}return c.json({error:error instanceof AccessError||error instanceof RecordError||error instanceof ZodError?error.message:'The enquiry was not confirmed; retry with the same submission key.'},error instanceof AccessError||error instanceof RecordError?error.status:error instanceof ZodError?400:503);});
 const body=async(request:Request)=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await boundedRequestBody(request,16384)));
 const admission:MiddlewareHandler=async(c,next)=>{
  c.header('Cache-Control','no-store');c.header('Vary','Origin');
  try{const admission=await admittedFormOrigin(db,c.req.raw);if(admission.external)c.header('Access-Control-Allow-Origin',admission.origin);}catch(error){await forms.refuse(c.req.param('slug')!,'origin',options,c.req.raw);throw error;}
  await next();
 };
 app.use('/:slug',admission);app.use('/:slug/challenge',admission);
 app.options('/:slug',async c=>{
  const method=c.req.header('Access-Control-Request-Method'),headers=(c.req.header('Access-Control-Request-Headers')??'').toLowerCase().split(',').map(v=>v.trim()).filter(Boolean);
  if(method!=='POST'||headers.some(value=>value!=='content-type')){await forms.refuse(c.req.param('slug'),'preflight',options,c.req.raw);return c.json({error:'Only JSON POST submissions are allowed.'},403);}
  await forms.preflight(c.req.param('slug'),options,c.req.raw);c.header('Access-Control-Allow-Methods','POST');c.header('Access-Control-Allow-Headers','Content-Type');return c.body(null,204);
 });
 app.options('/:slug/challenge',async c=>{
  const headers=(c.req.header('Access-Control-Request-Headers')??'').toLowerCase().split(',').map(v=>v.trim()).filter(Boolean);
  if(c.req.header('Access-Control-Request-Method')!=='POST'||headers.some(value=>value!=='content-type')){await forms.refuse(c.req.param('slug'),'preflight',options,c.req.raw);return c.json({error:'Only JSON POST challenges are allowed.'},403);}
  await forms.preflight(c.req.param('slug'),options,c.req.raw);c.header('Access-Control-Allow-Methods','POST');c.header('Access-Control-Allow-Headers','Content-Type');return c.body(null,204);
 });
 app.post('/:slug/challenge',async c=>{
  const reject=async(reason:string,message:string,status:400|413|415)=>{await forms.refuse(c.req.param('slug'),reason,options,c.req.raw);return c.json({error:message},status);};
  if(c.req.header('Content-Type')?.split(';')[0]!=='application/json'||c.req.header('Content-Encoding')&&!['identity'].includes(c.req.header('Content-Encoding')!))return reject('encoding','Use an unencoded JSON request.',415);
  try{const input=z.object({idempotencyKey:z.string().uuid()}).strict().parse(await body(c.req.raw));return c.json(await forms.challenge(c.req.param('slug'),input.idempotencyKey,options,c.req.raw));}catch(error){if(error instanceof RequestBodyTooLarge)return reject('body_size','The request exceeds 16 KiB.',413);if(error instanceof SyntaxError||error instanceof TypeError)return reject('body','Provide valid JSON.',400);if(error instanceof ZodError)await forms.refuse(c.req.param('slug'),'schema',options,c.req.raw);throw error;}
 });
 app.post('/:slug',async c=>{
  const reject=async(reason:string,message:string,status:400|403|413|415)=>{await forms.refuse(c.req.param('slug'),reason,options,c.req.raw);return c.json({error:message},status);};
  if(c.req.header('Content-Type')?.split(';')[0]!=='application/json'||c.req.header('Content-Encoding')&&!['identity'].includes(c.req.header('Content-Encoding')!))return reject('encoding','Use an unencoded JSON submission.',415);
  let input:unknown;try{input=await body(c.req.raw);}catch(error){if(error instanceof RequestBodyTooLarge)return reject('body_size','The form submission exceeds 16 KiB.',413);if(error instanceof SyntaxError||error instanceof TypeError)return reject('body','Provide valid JSON.',400);throw error;}
  try{return c.json(await forms.submitPublic(c.req.param('slug'),input,options,c.req.raw));}catch(error){if(error instanceof ZodError)await forms.refuse(c.req.param('slug'),'schema',options,c.req.raw);throw error;}
 });return app;
}
