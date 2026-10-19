import {Hono} from 'hono';
import {z,ZodError} from 'zod';
import {FormService} from './service';
import type {FormAbuseOptions} from './abuse';
import {AccessError} from '../access/errors';
import {RecordError} from '../records/shared';
import {boundedRequestBody,RequestBodyTooLarge} from '../../platform/bounded-request-body';
import {consumeRateLimit,publicIdentity} from '../../platform/public-rate-limit';
export function createPublicFormRoutes(db:D1Database,options:FormAbuseOptions={}){
 const app=new Hono(),forms=new FormService(db);
 app.onError(async(error,c)=>{if(error instanceof AccessError&&error.code==='permission'){const now=Date.now(),limited=await consumeRateLimit(db,`public:${await publicIdentity(c.req.raw,now)}`,300,now);if(limited)return limited;}return c.json({error:error instanceof AccessError||error instanceof RecordError||error instanceof ZodError?error.message:'The enquiry was not confirmed; retry with the same submission key.'},error instanceof AccessError||error instanceof RecordError?error.status:error instanceof ZodError?400:503);});
 const body=async(request:Request)=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await boundedRequestBody(request,16384)));
 app.post('/:slug/challenge',async c=>{
  if(c.req.header('Origin')!==new URL(c.req.url).origin)return c.json({error:'Request origin is not allowed.'},403);
  if(c.req.header('Content-Type')?.split(';')[0]!=='application/json'||c.req.header('Content-Encoding')&&!['identity'].includes(c.req.header('Content-Encoding')!))return c.json({error:'Use an unencoded JSON request.'},415);
  const input=z.object({idempotencyKey:z.string().uuid()}).strict().parse(await body(c.req.raw));return c.json(await forms.challenge(c.req.param('slug'),input.idempotencyKey,options));
 });
 app.post('/:slug',async c=>{
  const reject=async(reason:string,message:string,status:400|403|413|415)=>{await forms.refuse(c.req.param('slug'),reason,options,c.req.raw);return c.json({error:message},status);};
  if(c.req.header('Origin')!==new URL(c.req.url).origin)return reject('origin','Request origin is not allowed.',403);
  if(c.req.header('Content-Type')?.split(';')[0]!=='application/json'||c.req.header('Content-Encoding')&&!['identity'].includes(c.req.header('Content-Encoding')!))return reject('encoding','Use an unencoded JSON submission.',415);
  let input:unknown;try{input=await body(c.req.raw);}catch(error){if(error instanceof RequestBodyTooLarge)return reject('body_size','The form submission exceeds 16 KiB.',413);if(error instanceof SyntaxError||error instanceof TypeError)return reject('body','Provide valid JSON.',400);throw error;}
  try{return c.json(await forms.submitPublic(c.req.param('slug'),input,options,c.req.raw));}catch(error){if(error instanceof ZodError)await forms.refuse(c.req.param('slug'),'schema',options,c.req.raw);throw error;}
 });return app;
}
