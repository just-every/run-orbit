import {Hono} from 'hono';
import {z} from 'zod';
import type {AuthenticatedOperator} from '../identity';
import {audit} from '../records/shared';
import {actionMapping} from '../slack/identity';
import {credentials,installation,providerFailure} from '../slack/installation';
import {checkedPersonalUser,SlackProviderError} from '../slack/provider';
import {SlackError,type SlackConfig} from '../slack/contracts';
import {personalAuthority} from './personal-access';
import {processPersonalSlack} from './personal-delivery';
export function personalSlackRoutes(db:D1Database,config:SlackConfig){
 const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>();
 app.onError(async(e,c)=>{await providerFailure(db,e);return c.json({error:e instanceof SlackError?e.message:e instanceof SlackProviderError?'Slack identity could not be verified. Check the connection in Settings.':'Personal notification settings could not be saved.'},e instanceof SlackError?e.status:503);});
 app.get('/',async c=>{const actor=c.get('operator').operatorId,item=await installation(db),current=await personalAuthority(db,actor),mappings=item?.state==='connected'?(await db.prepare(`SELECT m.slack_user_id FROM slack_mappings m JOIN access_workspaces w ON w.policy_epoch=m.policy_epoch WHERE w.id='workspace' AND m.operator_id=? AND m.team_id=? AND m.enterprise_id=? AND m.app_id=? AND m.revoked_at IS NULL ORDER BY m.slack_user_id`).bind(actor,item.team_id,item.enterprise_id,item.app_id).all<{slack_user_id:string}>()).results:[];
  const notices=(await db.prepare('SELECT id,state,error,created_at AS createdAt FROM slack_personal_notices WHERE operator_id=? ORDER BY created_at DESC,id DESC LIMIT 100').bind(actor).all()).results;
  return c.json({enabled:Boolean(current),slackUserId:current?.p.slack_user_id??null,mappings:mappings.map(m=>m.slack_user_id),notices});});
 app.put('/',async c=>{const actor=c.get('operator').operatorId,input=z.object({enabled:z.boolean(),slackUserId:z.string().regex(/^U[A-Z0-9]{1,40}$/).optional()}).strict().safeParse(await c.req.json());if(!input.success)throw new SlackError(400,'Choose your mapped Slack identity and mention preference.');
  if(!input.data.enabled){await db.batch([db.prepare('UPDATE slack_personal_preferences SET enabled=0,revision=?,updated_at=? WHERE operator_id=?').bind(crypto.randomUUID(),new Date().toISOString(),actor),db.prepare("UPDATE slack_personal_notices SET state='withdrawn',error='Personal consent withdrawn' WHERE operator_id=? AND state IN('queued','rate-limited','failed')").bind(actor),audit(db,actor,'slack.personal-consent','operator',actor,{enabled:false})]);return c.json({saved:true});}
  const item=await installation(db),user=input.data.slackUserId;if(!item||item.state!=='connected'||!user||(await actionMapping(db,item,user))?.operator_id!==actor)throw new SlackError(409,'Ask the installation owner to explicitly map your current Slack identity first.');
  const {token}=await credentials(db,config);await checkedPersonalUser(token,user,item.team_id,config.fetcher);
  const current=await personalAuthority(db,actor);if(current?.p.slack_user_id===user)return c.json({saved:true});
  const now=new Date().toISOString();
  const saved=await db.prepare(`INSERT INTO slack_personal_preferences(operator_id,enabled,revision,slack_user_id,team_id,enterprise_id,app_id,policy_epoch,mapping_confirmed_at,installation_epoch,updated_at)
  SELECT m.operator_id,1,?,m.slack_user_id,m.team_id,m.enterprise_id,m.app_id,m.policy_epoch,m.confirmed_at,i.connected_at,? FROM slack_mappings m JOIN slack_installation i ON i.team_id=m.team_id AND i.enterprise_id=m.enterprise_id AND i.app_id=m.app_id JOIN access_workspaces w ON w.policy_epoch=m.policy_epoch AND w.id='workspace' JOIN operators o ON o.id=m.operator_id JOIN access_memberships a ON a.operator_id=o.id AND a.workspace_id='workspace' AND a.status='active'
  WHERE m.operator_id=? AND m.slack_user_id=? AND m.revoked_at IS NULL AND o.status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=o.id) AND i.connected_at=? AND i.state='connected'
  ON CONFLICT(operator_id) DO UPDATE SET enabled=1,revision=excluded.revision,slack_user_id=excluded.slack_user_id,team_id=excluded.team_id,enterprise_id=excluded.enterprise_id,app_id=excluded.app_id,policy_epoch=excluded.policy_epoch,mapping_confirmed_at=excluded.mapping_confirmed_at,installation_epoch=excluded.installation_epoch,updated_at=excluded.updated_at`).bind(crypto.randomUUID(),now,actor,user,item.connected_at).run();
  if(!saved.meta.changes)throw new SlackError(409,'Mapping or authority changed; review your preference again.');
  await db.batch([audit(db,actor,'slack.personal-consent','operator',actor,{enabled:true,slackUserId:user}),db.prepare("UPDATE slack_personal_notices SET state='withdrawn',error='Personal consent changed' WHERE operator_id=? AND state IN('queued','rate-limited','failed')").bind(actor)]);return c.json({saved:true});
 });
 app.post('/:id/retry',async c=>{const actor=c.get('operator').operatorId,id=c.req.param('id');const changed=await db.prepare("UPDATE slack_personal_notices SET state='queued',retry_at=NULL,error=NULL WHERE id=? AND operator_id=? AND state='failed'").bind(id,actor).run();if(!changed.meta.changes)throw new SlackError(409,'Only your explicitly failed notice can be retried. Uncertain attempts are never resent.');await processPersonalSlack(db,config);return c.json({checked:true});});
 return app;
}
