import {Hono} from 'hono';
import {buildBrief,selectedTargets} from '../today/brief';
import {buildMeetingPlan,meetingContext} from '../today/meeting-plan';
import {TodayError} from '../today/errors';
import {delegationTarget} from '../today/links';
import {currentGrant} from './authority';
import {deny,type Grant} from './protocol';

const readable=(g:Grant)=>{if(!JSON.parse(g.scopes_json).includes('crm.evidence.read'))deny(403,'SCOPE_DENIED');return JSON.parse(g.targets_json) as string[];};

/** Read-only brief and meeting plans for an application holding crm.evidence.read, narrowed to its selected records.
 * They are further reads under the same scope; /identity keeps its rer-delegation/1 shape. */
export function briefReadRoutes(db:D1Database){
 const app=new Hono<{Variables:{grant:Grant}}>();
 app.get('/brief',async c=>{const g=c.get('grant'),targets=readable(g);const brief=await buildBrief(db,{operatorId:g.principal_id,visible:selectedTargets(targets)});await currentGrant(db,g.id,g);return c.json({provider:'orbit',principalId:g.principal_id,observedAt:new Date().toISOString(),brief});});
 app.get('/plan',async c=>{
  const g=c.get('grant'),targets=readable(g),target=c.req.query('target')??'',signalId=/^signals\/([A-Za-z0-9_-]{1,100})$/.exec(target)?.[1];
  if(!signalId)deny(400,'INVALID_REQUEST');
  try{
   const context=await meetingContext(db,signalId!);
   if(!targets.includes(target)&&!context.links.some(ref=>targets.includes(delegationTarget(ref))))deny(404,'NOT_FOUND');
   // A selected opportunity's evidence read already carries its contacts and company; nothing else is added.
   const scope=new Set(targets);for(const target of targets.filter(t=>/^opportunities\/[^/]+$/.test(t))){const id=target.split('/')[1]!;for(const row of (await db.prepare("SELECT 'contacts/'||contact_id AS t FROM opportunity_contacts WHERE opportunity_id=?1 UNION SELECT 'companies/'||company_id FROM opportunities WHERE id=?1 AND company_id IS NOT NULL").bind(id).all<{t:string}>()).results)scope.add(row.t);}
   const plan=await buildMeetingPlan(db,signalId!,{operatorId:g.principal_id,allowed:ref=>scope.has(delegationTarget(ref))});await currentGrant(db,g.id,g);
   return c.json({provider:'orbit',principalId:g.principal_id,target,observedAt:new Date().toISOString(),plan});
  }catch(error){if(error instanceof TodayError)deny(404,'NOT_FOUND');throw error;}
 });
 return app;
}
