import {audit} from '../records/shared';
import {currentEpoch} from './identity';
import {SlackError,type Installation,type SlackConfig} from './contracts';
import {slackCall,SlackProviderError} from './provider';
export async function installation(db:D1Database){return db.prepare('SELECT * FROM slack_installation WHERE id=?').bind('slack').first<Installation>();}
export async function credentials(db:D1Database,config:SlackConfig){const row=await db.prepare('SELECT ciphertext FROM slack_credentials WHERE id=?').bind('slack').first<{ciphertext:string}>();if(!row||!config.security)throw new SlackError(503,'Slack is unresolved setup. Enter credentials again; notices are paused.');try{return JSON.parse(await config.security.open(row.ciphertext)) as {token:string;signingSecret:string};}catch{throw new SlackError(503,'Slack credentials cannot be opened. Reconnect in Settings.');}}
export async function providerFailure(db:D1Database,error:unknown){if(error instanceof SlackProviderError&&error.revoked){await db.batch([db.prepare("UPDATE slack_installation SET state='revoked',error=?").bind(error.code),db.prepare("UPDATE slack_notices SET state='paused',error=? WHERE state IN ('queued','rate-limited','failed')").bind(error.code)]);}}
export async function requireAdmin(db:D1Database,id:string){if(!await db.prepare("SELECT 1 FROM operators WHERE id=? AND setup_owner=1 AND status='active'").bind(id).first())throw new SlackError(403,'Only the installation owner administers Slack until TEAM-005.');}
export async function connect(db:D1Database,config:SlackConfig,token:string,signingSecret:string,origin:string,actor:string){
 if(!config.security)throw new SlackError(503,'Slack needs the installation encryption key.');
 const auth=await slackCall(token,'auth.test',{},config.fetcher);
 if(typeof auth.team_id!=='string'||typeof auth.user_id!=='string'||!auth.bot_id)throw new SlackError(400,'Enter an installed Slack bot token.');
 const prior=await installation(db);if(prior&&(prior.team_id!==auth.team_id||prior.enterprise_id!==(auth.enterprise_id??'')))throw new SlackError(409,'Disconnect and remove the previous workspace configuration before changing Slack teams.');
 const previousMappings=(await db.prepare('SELECT * FROM slack_mappings').all()).results;
 const sealed=await config.security.seal(JSON.stringify({token,signingSecret}));
 await db.batch([db.prepare("INSERT INTO slack_installation(id,team_id,bot_user_id,state,error,origin,connected_at,enterprise_id) VALUES('slack',?,?,'connected',NULL,?,?,?) ON CONFLICT(id) DO UPDATE SET app_id=CASE WHEN bot_user_id=excluded.bot_user_id THEN app_id ELSE NULL END,bot_user_id=excluded.bot_user_id,state='connected',error=NULL,retry_at=NULL,origin=excluded.origin,connected_at=excluded.connected_at,enterprise_id=excluded.enterprise_id").bind(auth.team_id,auth.user_id,origin,new Date().toISOString(),auth.enterprise_id??''),db.prepare("INSERT INTO slack_credentials VALUES('slack',?) ON CONFLICT(id) DO UPDATE SET ciphertext=excluded.ciphertext").bind(sealed),db.prepare("UPDATE slack_mappings SET revoked_at=COALESCE(revoked_at,?)").bind(new Date().toISOString()),db.prepare('UPDATE slack_channels SET enabled=0'),db.prepare("UPDATE slack_notices SET state='held',error='Reconnect does not replay historical notices' WHERE state IN ('paused','queued','rate-limited')"),db.prepare('DELETE FROM slack_action_tokens'),audit(db,actor,'slack.installation-connected','slack','slack',{team:auth.team_id,bot:auth.user_id,reconfirmedMappings:false,previousMappings,revoked:true})]);
}
export async function slackStatus(db:D1Database){
 const item=await installation(db),held=Boolean(await db.prepare("SELECT 1 FROM slack_credentials WHERE id='slack'").first());
 const channels=(await db.prepare('SELECT * FROM slack_channels ORDER BY name').all()).results;
 const counts=(await db.prepare('SELECT channel_id,state,count(*) AS total FROM slack_notices GROUP BY channel_id,state').all<{channel_id:string;state:string;total:number}>()).results;
 return{policyEpoch:await currentEpoch(db),installation:item?{...item,state:!held&&item.state==='connected'?'disconnected':item.state,error:held?item.error:item.error??'Credentials excluded from archive; reconnect in Settings.'}:null,
 channels:channels.map(channel=>({...channel,noticeStates:Object.fromEntries(counts.filter(row=>row.channel_id===channel.id).map(row=>[row.state,row.total]))})),
 mappings:(await db.prepare('SELECT m.*,o.display_name,o.status AS operator_status FROM slack_mappings m JOIN operators o ON o.id=m.operator_id ORDER BY m.slack_user_id').all()).results,
 deletions:(await db.prepare('SELECT d.*,c.name AS channel_name FROM slack_deletions d JOIN slack_channels c ON c.id=d.channel_id ORDER BY d.created_at DESC LIMIT 100').all()).results,
 notices:(await db.prepare('SELECT n.*,c.name AS channel_name,o.display_name AS acknowledged_name FROM slack_notices n JOIN slack_channels c ON c.id=n.channel_id LEFT JOIN operators o ON o.id=n.acknowledged_by ORDER BY n.created_at DESC,n.id DESC LIMIT 100').all()).results};
}
