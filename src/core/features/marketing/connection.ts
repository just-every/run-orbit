import {audit} from '../records/shared';
import {consentTag,MailchimpError,mailchimpSource,type Audience,type ConnectionSettings,type MailchimpConfig,type Sealed} from './contracts';
import {audienceLink,dataCenter,mailchimpCall,MailchimpProviderError,refusalMessage} from './provider';

interface SourceRow {type:string;enabled:number;secret_ciphertext:string|null;cursor:string|null;last_error:string|null;last_accepted_at:string|null}
export const ownership='Mailchimp owns bulk campaigns and marketing automation; Orbit owns individual sales sequences and their outcomes.';
export async function sourceRow(db:D1Database){return db.prepare('SELECT type,enabled,secret_ciphertext,cursor,last_error,last_accepted_at FROM signal_sources WHERE id=?').bind(mailchimpSource).first<SourceRow>();}
export function connectionSettings(row:SourceRow|null){if(row?.type!=='mail_provider'||!row.cursor)return null;try{return JSON.parse(row.cursor) as ConnectionSettings;}catch{return null;}}
/** Connected only after a passing key check with a chosen audience. Anything else is unresolved setup with its reason, including a restored installation, whose sealed key never travels. */
export async function connection(db:D1Database){
 const row=await sourceRow(db),settings=connectionSettings(row);
 const reason=!row||!settings?'Connect Mailchimp with an API key.':!row.secret_ciphertext?(row.last_error??'Mailchimp credentials are not in this installation. Connect Mailchimp again.'):!row.enabled?(row.last_error??'Check the Mailchimp connection.'):!settings.audience?'Choose the Mailchimp audience that receives consented contacts.':null;
 return {state:reason?'unresolved-setup' as const:'connected' as const,reason,settings,held:Boolean(row?.secret_ciphertext&&settings),lastEventAt:row?.last_accepted_at??null,link:settings?.audience?audienceLink(settings.dataCenter,settings.audience.webId):null};
}
export async function openSealed(db:D1Database,config:MailchimpConfig){
 const row=await sourceRow(db);if(!row?.secret_ciphertext||!connectionSettings(row)||!config.security)throw new MailchimpError(409,'Mailchimp is not connected. Connect it in Settings first.');
 try{return JSON.parse(await config.security.open(row.secret_ciphertext)) as Sealed;}catch{throw new MailchimpError(409,'The saved Mailchimp key cannot be opened. Connect Mailchimp again.');}
}
export function saveSettings(db:D1Database,settings:ConnectionSettings){return db.prepare("UPDATE signal_sources SET cursor=?,updated_at=? WHERE id=? AND type='mail_provider'").bind(JSON.stringify(settings),new Date().toISOString(),mailchimpSource).run();}
export function markUnresolved(db:D1Database,reason:string){return db.prepare("UPDATE signal_sources SET enabled=0,last_error=?,updated_at=? WHERE id=? AND type='mail_provider'").bind(reason,new Date().toISOString(),mailchimpSource).run();}
/** A failed check never reads as connected: a refused key leaves unresolved setup, and no answer changes nothing. */
async function checked<T>(db:D1Database,request:()=>Promise<T>){
 try{return await request();}
 catch(error){if(!(error instanceof MailchimpProviderError))throw error;if(error.status===401||error.status===403)await markUnresolved(db,refusalMessage(error));throw new MailchimpError(error.refused?409:502,refusalMessage(error));}
}
export async function connect(db:D1Database,config:MailchimpConfig,apiKey:string,actor:string){
 if(!config.security)throw new MailchimpError(503,'Mailchimp needs the installation encryption key.');
 const dc=dataCenter(apiKey);
 try{await mailchimpCall(apiKey,'GET','/ping',undefined,config.fetcher);}catch(error){if(error instanceof MailchimpProviderError)throw new MailchimpError(error.refused?400:502,error.status===401?'Mailchimp refused this API key. Check that you copied the whole key, or create a new one in Mailchimp (Profile, Extras, API keys).':refusalMessage(error));throw error;}
 const now=new Date().toISOString(),webhookToken=Array.from(crypto.getRandomValues(new Uint8Array(32)),byte=>byte.toString(16).padStart(2,'0')).join('');
 const settings:ConnectionSettings={dataCenter:dc,audience:null,mergeTags:[],connectedBy:actor,connectedAt:now,checkedAt:now,webhookCheckedAt:null};
 const [saved]=await db.batch([db.prepare("INSERT INTO signal_sources(id,name,type,enabled,created_at,updated_at,secret_ciphertext,cursor,last_error) VALUES(?,'Mailchimp audience events','mail_provider',1,?,?,?,?,NULL) ON CONFLICT(id) DO UPDATE SET enabled=1,secret_ciphertext=excluded.secret_ciphertext,cursor=excluded.cursor,last_error=NULL,updated_at=excluded.updated_at WHERE signal_sources.type='mail_provider'").bind(mailchimpSource,now,now,await config.security.seal(JSON.stringify({apiKey:apiKey.trim(),webhookToken} satisfies Sealed)),JSON.stringify(settings))]);
 if(saved?.meta.changes!==1)throw new MailchimpError(409,'A signal source named “mailchimp” already exists. Remove or rename it under Signal sources before connecting Mailchimp.');
 await audit(db,actor,'mailchimp.connected','mailchimp',mailchimpSource,{dataCenter:dc}).run();
}
export async function check(db:D1Database,config:MailchimpConfig,actor:string){
 const {apiKey}=await openSealed(db,config),settings=connectionSettings(await sourceRow(db))!;
 await checked(db,()=>mailchimpCall(apiKey,'GET','/ping',undefined,config.fetcher));
 await db.batch([db.prepare("UPDATE signal_sources SET enabled=1,last_error=NULL,cursor=?,updated_at=? WHERE id=? AND type='mail_provider'").bind(JSON.stringify({...settings,checkedAt:new Date().toISOString()}),new Date().toISOString(),mailchimpSource),audit(db,actor,'mailchimp.checked','mailchimp',mailchimpSource)]);
}
export async function audiences(db:D1Database,config:MailchimpConfig){
 const {apiKey}=await openSealed(db,config);
 const result=await checked(db,()=>mailchimpCall<{lists?:{id:string;name:string;web_id:number;stats?:{member_count?:number}}[]}>(apiKey,'GET','/lists?count=100&fields=lists.id,lists.name,lists.web_id,lists.stats.member_count',undefined,config.fetcher));
 return (result.lists??[]).map(list=>({id:list.id,name:list.name,members:list.stats?.member_count??null}));
}
/** Choosing an audience adds Orbit's hidden consent field to it when missing; nothing else in the audience changes. */
export async function chooseAudience(db:D1Database,config:MailchimpConfig,audienceId:string,actor:string){
 if(!/^[a-z0-9]{1,32}$/i.test(audienceId))throw new MailchimpError(400,'Choose a Mailchimp audience.');
 const {apiKey}=await openSealed(db,config),settings=connectionSettings(await sourceRow(db))!;
 const list=await checked(db,()=>mailchimpCall<{id:string;name:string;web_id:number}>(apiKey,'GET',`/lists/${audienceId}?fields=id,name,web_id`,undefined,config.fetcher));
 const tags=(await checked(db,()=>mailchimpCall<{merge_fields?:{tag:string}[]}>(apiKey,'GET',`/lists/${audienceId}/merge-fields?count=100&fields=merge_fields.tag`,undefined,config.fetcher))).merge_fields?.map(field=>field.tag)??[];
 if(!tags.includes(consentTag)){await checked(db,()=>mailchimpCall(apiKey,'POST',`/lists/${audienceId}/merge-fields`,{tag:consentTag,name:'Orbit consent',type:'text',required:false,public:false,help_text:'Consent source and basis recorded in Orbit'},config.fetcher));tags.push(consentTag);}
 const audience:Audience={id:list.id,name:list.name,webId:list.web_id};
 await db.batch([db.prepare("UPDATE signal_sources SET cursor=?,enabled=1,last_error=NULL,updated_at=? WHERE id=? AND type='mail_provider'").bind(JSON.stringify({...settings,audience,mergeTags:tags}),new Date().toISOString(),mailchimpSource),audit(db,actor,'mailchimp.audience-chosen','mailchimp',mailchimpSource,{audience:audience.id,name:audience.name})]);
 return audience;
}
/** Disconnecting deletes the sealed key and webhook token, so every handoff and webhook stops at once. */
export async function disconnect(db:D1Database,actor:string){
 await db.batch([db.prepare("UPDATE signal_sources SET enabled=0,secret_ciphertext=NULL,last_error=?,updated_at=? WHERE id=? AND type='mail_provider'").bind('Disconnected in Settings. Orbit hands no contacts to Mailchimp and receives none of its unsubscribes until you connect again.',new Date().toISOString(),mailchimpSource),audit(db,actor,'mailchimp.disconnected','mailchimp',mailchimpSource)]);
}
