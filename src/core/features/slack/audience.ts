import {salesCanRead} from '../teams/record-access';
import {isFullOperator} from '../access/identity-class';
import {teamMembers,salesProfile} from '../teams/policy';
import {actionMapping} from './identity';
import {SlackError,type Installation} from './contracts';
import {slackCall} from './provider';
/** A team route can reach only explicitly mapped, currently confirmed native team members. */
export async function checkedAudience(db:D1Database,item:Installation,token:string,channelId:string,teamId:string|null,fetcher?:typeof fetch){
 if(!teamId)return;
 if(!await db.prepare('SELECT 1 FROM sales_teams WHERE id=? AND active=1').bind(teamId).first())throw new SlackError(403,'The sales team is no longer active. Reconfirm the channel audience.');
 const members=new Set(await teamMembers(db,teamId));let cursor='';
 do{const page=await slackCall(token,'conversations.members',{channel:channelId,limit:200,cursor},fetcher);
  if(!Array.isArray(page.members))throw new SlackError(403,'Slack did not confirm the channel audience.');
  for(const user of page.members){if(user===item.bot_user_id)continue;const mapping=await actionMapping(db,item,user);if(!mapping||!members.has(mapping.operator_id))throw new SlackError(403,'Every channel member must have a current mapping to this sales team. Reconfirm mappings or channel membership.');}
  cursor=page.response_metadata?.next_cursor??'';
 }while(cursor);
}
export async function noticeAudience(db:D1Database,channelId:string){
 const channel=await db.prepare('SELECT audience_team_id FROM slack_channels WHERE id=?').bind(channelId).first<{audience_team_id:string|null}>();if(!channel)return [];
 if(channel.audience_team_id)return teamMembers(db,channel.audience_team_id);
 return (await db.prepare("SELECT o.id FROM operators o WHERE o.status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators c WHERE c.operator_id=o.id)").all<{id:string}>()).results.map(row=>row.id);
}
/** No generic notice or authenticated link is sent to an audience with a hidden record. */
export async function audienceCanRead(db:D1Database,channelId:string,kind:string,id:string,fields:string[]=[]){
 const audience=await noticeAudience(db,channelId);if(!audience.length)return false;
 const linked=kind==='opportunity'?(await db.prepare("SELECT 'company' AS kind,company_id AS id FROM opportunities WHERE id=? AND company_id IS NOT NULL UNION SELECT 'contact' AS kind,contact_id AS id FROM opportunity_contacts WHERE opportunity_id=?").bind(id,id).all<{kind:string;id:string}>()).results:kind==='contact'?(await db.prepare("SELECT 'company' AS kind,company_id AS id FROM contacts WHERE id=? AND company_id IS NOT NULL").bind(id).all<{kind:string;id:string}>()).results:[];
 for(const actor of audience){if(!await salesProfile(db,actor)){if(!await isFullOperator(db,actor))return false;continue;}if(!await salesCanRead(db,actor,kind,id,fields))return false;for(const record of linked)if(!await salesCanRead(db,actor,record.kind,record.id))return false;}
 return true;
}
