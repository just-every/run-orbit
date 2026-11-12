import {noticeFields} from './contracts';

/** Public setup facts, independent of whether this installation holds credentials. */
export function slackDeclaration(origin:string){
 return {
  scopes:[
   {name:'chat:write',purpose:'Post allowed-field notices and delete the bot’s messages',when:'always'},
   {name:'channels:read',purpose:'Check public channel membership and safety',when:'always'},
   {name:'groups:read',purpose:'Check private channel membership and safety',when:'private-channels'},
   {name:'users:read',purpose:'Receive user_change deactivation events and check mapped personal recipients',when:'always'},
   {name:'im:write',purpose:'Open a direct message for an explicitly opted-in personal mention',when:'personal-mentions'}
  ],
  prohibitedScopes:['users:read.email'],
  callbacks:{
   interactivity:{url:origin+'/api/v1/slack/actions',verification:'Slack timestamp and HMAC-SHA256 signature'},
   events:{url:origin+'/api/v1/slack/events',verification:'Slack timestamp and HMAC-SHA256 signature',subscriptions:['user_change','channel_shared','channel_unshared','channel_archive','group_archive','channel_left','member_left_channel','app_uninstalled','tokens_revoked']}
  },
  allowedFields:Object.entries(noticeFields).map(([key,label])=>({key,label})),
  custody:{location:'installation-local',encryption:'AES-GCM with the installation encryption key',credentials:['bot token','app signing secret'],readBack:false,exported:false},
  audience:{membershipCanChangeBetweenChecks:true,newlyLinkedOrganizationMaySeeChannelHistory:true,prePostCheck:true,safetyEventsSuspendRouting:true},
  controls:{disconnect:'/api/v1/settings/slack/disconnect',reconnect:'/api/v1/settings/slack/connect',replaysOldNotices:false,replaysOldActions:false},
  costs:'Slack account and plan requirements remain with Slack; Orbit does not buy a plan or authorize spending.',
  freshness:'Membership is checked before each post; signed safety events suspend routing until the owner confirms it again.'
 };
}
export type SlackDeclaration=ReturnType<typeof slackDeclaration>;
