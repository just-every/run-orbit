import {Hono} from 'hono';
import {z} from 'zod';
import {systemClock,type Clock} from '../../platform/clock';
import {boundedRequestBody,RequestBodyTooLarge} from '../../platform/bounded-request-body';
import {consumeRateLimit,publicIdentity} from '../../platform/public-rate-limit';
import {RecordError} from '../records/shared';
import {authenticateApi,ApiError,type ApiCredential} from './authority';
import {ApiDeals} from './resources';
import seed from '../../../../seed.json';

const id=z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
const fields=z.object({title:z.string().trim().min(1).max(500),stage_id:id,value_cents:z.number().int().min(0).max(100000000000),company_id:id.nullable()}).partial().strict();
const creation=fields.required({title:true,stage_id:true,value_cents:true});
async function body(request:Request){
 try{return JSON.parse(new TextDecoder().decode(await boundedRequestBody(request,16384)));}catch(error){if(error instanceof RequestBodyTooLarge)throw new ApiError(413,'The request exceeds 16 KiB.');throw new ApiError(400,'Provide a valid JSON body.');}
}
function parse<T>(schema:z.ZodType<T>,input:unknown):T{const result=schema.safeParse(input);if(!result.success)throw new ApiError(400,'Invalid API request schema.');return result.data;}

/** Standalone versioned resources; no operator session is consulted or created. */
export function publicApiRoutes(db:D1Database,clock:Clock=systemClock){
 const app=new Hono<{Variables:{credential:ApiCredential}}>(),deals=new ApiDeals(db,clock);
 app.onError((error,c)=>c.json({error:error instanceof ApiError||error instanceof RecordError?error.message:'The API request failed; no success was confirmed.'},error instanceof ApiError||error instanceof RecordError?error.status:503));
 app.use('*',async(c,next)=>{
  c.header('Cache-Control','no-store');
  if(!seed.deploy.publicPaths.some(path=>path.endsWith('/')?c.req.path.startsWith(path):c.req.path===path))throw new ApiError(503,'This API path is not declared public.');
  const now=clock.now().getTime(),limited=await consumeRateLimit(db,`api-public:${await publicIdentity(c.req.raw,now)}`,300,now);
  if(limited)return limited;
  const credential=await authenticateApi(db,c.req.raw,clock);c.set('credential',credential);
  const bucket=`api:${credential.id}:${Math.floor(now/60000)}`;
  const result=await db.batch([db.prepare('DELETE FROM public_rate_limits WHERE expires_at<=?').bind(now),db.prepare('INSERT INTO public_rate_limits VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1 RETURNING count').bind(bucket,now+120000)]);
  const count=(result[1]!.results[0] as {count:number}).count;
  c.header('RateLimit-Limit','300');c.header('RateLimit-Remaining',String(Math.max(0,300-count)));c.header('RateLimit-Reset',String(60-Math.floor(now/1000)%60));
  if(count>300){c.header('Retry-After',String(60-Math.floor(now/1000)%60));return c.json({error:'API rate limit exceeded.'},429);}
  await next();
 });
 const query=(c:{req:{query:()=>Record<string,string>;queries:()=>Record<string,string[]>}},list=false)=>{
  if(Object.values(c.req.queries()).some(values=>values.length!==1))throw new ApiError(400,'Repeated query parameters are not supported.');
  return parse(z.object({fields:z.string().optional(),...(list?{limit:z.coerce.number().int().min(1).max(100).default(50),cursor:id.optional(),title:z.string().max(500).optional()}:{} )}).strict(),c.req.query()) as {fields?:string;limit:number;cursor?:string;title?:string};
 };
 const selection=(credential:ApiCredential,requested?:string)=>requested===undefined?JSON.parse(credential.fields_json) as string[]:parse(z.array(z.string().min(1)).min(1).max(4),requested.split(','));
 app.get('/deals',async c=>{const input=query(c,true),credential=c.get('credential');return c.json(await deals.list(credential,input,selection(credential,input.fields)));});
 app.get('/deals/:id',async c=>{const input=query(c),credential=c.get('credential'),result=await deals.read(credential,parse(id,c.req.param('id')),selection(credential,input.fields));c.header('ETag',result.etag);return c.json({deal:result.deal});});
 app.post('/deals',async c=>{
  query(c);const key=parse(z.string().min(1).max(128),c.req.header('Idempotency-Key'));
  const result=await deals.create(c.get('credential'),parse(creation,await body(c.req.raw)),key);
  return c.json(result,result.replayed?200:201);
 });
 app.patch('/deals/:id',async c=>{
  query(c);const expected=parse(z.string().regex(/^"[a-f0-9]{64}"$/),c.req.header('If-Match')),input=parse(fields,await body(c.req.raw));
  if(!Object.keys(input).length)throw new ApiError(400,'Provide at least one changed field.');
  return c.json(await deals.update(c.get('credential'),parse(id,c.req.param('id')),input,expected));
 });
 app.all('*',c=>c.json({error:'API resource not found.'},404));
 return app;
}
