import {publicRateLimit} from '../../platform/public-rate-limit';
import {Hono} from 'hono';
import {z} from 'zod';
import type {AuthenticatedOperator} from '../identity';
import type {SourceSecurity} from '../../platform/source-security';
import {ProviderRepository} from '../outreach/provider-repository';
import {IngestionRepository} from './repository';
import {IngestionError} from './contracts';
import {createSignalIngress} from './routes';
import {signSource} from './booking-webhooks';
export function createSourceRoutes(db:D1Database,security?:SourceSecurity){
  const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>(),repository=new IngestionRepository(db);
  app.onError((error,c)=>c.json({error:error instanceof IngestionError?error.message:'Source operation failed; no success was confirmed.'},error instanceof IngestionError?error.status:500));
  app.get('/',async c=>c.json({sources:await repository.sources(),configured:Boolean(security)}));
  app.put('/:id',async c=>{
    if(!security)return c.json({error:'ORBIT_ENCRYPTION_KEY is required to encrypt source secrets.'},503);
    const parsed=z.object({name:z.string().trim().min(1).max(200),enabled:z.boolean()}).strict().safeParse(await c.req.json());
    if(!parsed.success||! /^[a-zA-Z0-9_-]{1,80}$/.test(c.req.param('id')))return c.json({error:'Enter a source name and enabled state. Orbit generates its signing secret.'},400);
    const secret=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
    await repository.configure({...parsed.data,secret,id:c.req.param('id')},security);return c.json({saved:true,secret},200,{'Cache-Control':'no-store'});
  });
  app.patch('/:id',async c=>{const parsed=z.object({enabled:z.boolean()}).strict().safeParse(await c.req.json());if(!parsed.success)return c.json({error:'Choose whether this source is enabled.'},400);await repository.setEnabled(c.req.param('id'),parsed.data.enabled,security);return c.json({saved:true});});
  app.get('/recipe-context',async c=>c.json({contacts:await repository.recipeContacts(),forms:await repository.publishedForms()}));
  app.post('/:id/test',async c=>{
    if(!security)return c.json({error:'Source encryption is not configured.'},503);
    const input=z.object({contactId:z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/)}).strict().safeParse(await c.req.json());
    if(!input.success)return c.json({error:'Choose a contact for the test event.'},400);
    const source=await repository.source(c.req.param('id'));
    if(!source?.enabled||!source.secret_ciphertext)return c.json({error:'Source is not configured.'},403);
    if(!await repository.contact(input.data.contactId))return c.json({error:'Contact not found.'},404);
    const raw=JSON.stringify({eventId:crypto.randomUUID(),type:'form.submitted',subject:'Form submitted · test',occurredAt:new Date().toISOString(),record:{type:'contact',id:input.data.contactId},data:{test:true}}),timestamp=String(Math.floor(Date.now()/1000));
    const signature=await signSource(await security.open(source.secret_ciphertext),`${timestamp}.${raw}`);
    const request=new Request(new URL(`/api/v1/signals/${source.id}`,c.req.url),{method:'POST',headers:{'Content-Type':'application/json','X-Orbit-Timestamp':timestamp,'X-Orbit-Signature':signature},body:raw});
    const limited=await publicRateLimit(db,request);if(limited)return limited;
    return await createSignalIngress(db,security).request(new Request(new URL(`/${source.id}`,c.req.url),request));
  });
  app.get('/replies',async c=>c.json({replies:await new ProviderRepository(db).unlinkedReplies()}));
  const recordId=z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  app.post('/replies/:id/link',async c=>{const input=z.object({opportunityId:recordId}).strict().safeParse(await c.req.json());if(!recordId.safeParse(c.req.param('id')).success||!input.success)return c.json({error:'Choose a valid reply and opportunity.'},400);await new ProviderRepository(db).linkReply(c.req.param('id'),input.data.opportunityId,c.get('operator').operatorId);return c.json({linked:true});});
  app.get('/unlinked',async c=>c.json({signals:await repository.unlinked()}));
  app.post('/unlinked/:id/link',async c=>{const input=z.object({type:z.enum(['contact','company','opportunity']),id:recordId}).strict().safeParse(await c.req.json());if(!recordId.safeParse(c.req.param('id')).success||!input.success)return c.json({error:'Select a record.'},400);await repository.link(c.req.param('id'),{...input.data,basis:'Operator review'},c.get('operator').operatorId);return c.json({linked:true});});
  return app;
}
