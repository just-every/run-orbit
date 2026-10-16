import {Hono} from 'hono';
import {ZodError} from 'zod';
import {FormService} from './service';
import {AccessError} from '../access/errors';
import {RecordError} from '../records/shared';
import {boundedRequestBody,RequestBodyTooLarge} from '../../platform/bounded-request-body';
export function createPublicFormRoutes(db:D1Database){const app=new Hono(),forms=new FormService(db);app.onError((error,c)=>c.json({error:error instanceof AccessError||error instanceof RecordError||error instanceof ZodError?error.message:'The enquiry was not confirmed; retry with the same submission key.'},error instanceof AccessError||error instanceof RecordError?error.status:error instanceof ZodError?400:503));
 app.post('/:slug',async c=>{if(c.req.header('Origin')!==new URL(c.req.url).origin)return c.json({error:'Request origin is not allowed.'},403);if(c.req.header('Content-Type')?.split(';')[0]!=='application/json'||c.req.header('Content-Encoding')&&!['identity'].includes(c.req.header('Content-Encoding')!))return c.json({error:'Use an unencoded JSON submission.'},415);let body:unknown;try{const bytes=await boundedRequestBody(c.req.raw,16384);body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch(error){if(error instanceof RequestBodyTooLarge)return c.json({error:'The form submission exceeds 16 KiB.'},413);if(error instanceof SyntaxError||error instanceof TypeError)return c.json({error:'Provide valid JSON.'},400);throw error;}return c.json(await forms.submit(c.req.param('slug'),body));});return app;
}
