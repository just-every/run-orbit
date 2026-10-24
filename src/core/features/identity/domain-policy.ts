import {devAdmitted} from '@runeditrun/rer/modules/operator-auth/dev-admission';
import {Hono} from 'hono';
import {z} from 'zod';
import type {AuthenticatedOperator} from './session';
import {actorFence,guard,clearGuards,ownerFence,refused,sessionStore} from './store';
import {RecordError,audit} from '../records/shared';
const domain=z.string().trim().toLowerCase().max(253).regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/);
export function domainPolicyRoutes(db:D1Database){const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>();
 app.onError((e,c)=>c.json({error:e instanceof RecordError?e.message:'Sign-in policy could not be saved.'},e instanceof RecordError?e.status:503));
 async function owner(request:Request){const session=await sessionStore(db,{devAdmitted}).read(request,Date.now());if(session?.operator.role!=='owner')throw new RecordError(403,'Only the installation owner changes sign-in policy.');return session;}
 app.get('/',async c=>{await owner(c.req.raw);return c.json({policies:(await db.prepare('SELECT domain,provider_id FROM identity_domain_policies ORDER BY domain').all()).results,providers:(await db.prepare("SELECT provider_id,issuer FROM oa_identity_providers WHERE status='linked' ORDER BY provider_id").all()).results});});
 app.put('/',async c=>{const input=z.object({domain,providerId:z.string().min(1).max(100).nullable()}).strict().safeParse(await c.req.json());if(!input.success)return c.json({error:'Enter a domain and choose its linked sign-in provider.'},400);const actor=await owner(c.req.raw),now=Date.now(),{domain:name,providerId}=input.data;
  try{await db.batch([guard(db,actorFence(actor,now)),guard(db,ownerFence(actor)),...(providerId?[guard(db,{sql:"EXISTS(SELECT 1 FROM oa_identity_providers WHERE provider_id=? AND status='linked')",args:[providerId]}),db.prepare('INSERT INTO identity_domain_policies VALUES(?,?,?,?) ON CONFLICT(domain) DO UPDATE SET provider_id=excluded.provider_id,updated_by=excluded.updated_by,updated_at=excluded.updated_at').bind(name,providerId,actor.operator.id,new Date(now).toISOString())]:[db.prepare('DELETE FROM identity_domain_policies WHERE domain=?').bind(name)]),db.prepare('UPDATE identity_settings SET generation=generation+1 WHERE id=1'),audit(db,actor.operator.id,'identity.domain-policy','installation','workspace',{domain:name,providerId}),clearGuards(db)]);}catch(e){if(refused(e))throw new RecordError(409,'Owner or provider changed. Review the policy again.');throw e;}return c.json({saved:true});
 });return app;
}
