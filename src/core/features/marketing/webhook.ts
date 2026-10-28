import {Hono} from 'hono';
import {boundedRequestBody,RequestBodyTooLarge} from '../../platform/bounded-request-body';
import {payloadHash} from '../../platform/source-security';
import {IngestionRepository} from '../ingestion/repository';
import {IngestionError,type SignalEvent} from '../ingestion/contracts';
import {mailchimpSource,type MailchimpConfig,type Sealed} from './contracts';
import {connectionSettings,saveSettings,sourceRow} from './connection';
import {linkStatement,withdrawalStatement} from './ledger';
import {subscriberHash} from './provider';

const types={unsubscribe:'email.unsubscribed',cleaned:'email.bounced',subscribe:'mailchimp:subscribe',profile:'mailchimp:profile',upemail:'mailchimp:upemail'} as const;
const subjects:Record<keyof typeof types,string>={unsubscribe:'Unsubscribed in Mailchimp',cleaned:'Mailchimp cleaned this address after a permanent bounce',subscribe:'Subscribed in Mailchimp; this never lifts an Orbit stop',profile:'Profile updated in Mailchimp',upemail:'Email address changed in Mailchimp'};
async function same(a:string,b:string){const [x,y]=await Promise.all([payloadHash(a),payloadHash(b)]);let difference=0;for(let i=0;i<x.length;i++)difference|=x.charCodeAt(i)^y.charCodeAt(i);return difference===0;}
/** Mailchimp list webhooks are unsigned: the unguessable token in the address is the only authority, and disconnecting deletes it. */
export function mailchimpWebhookRoutes(db:D1Database,config:MailchimpConfig){
 const app=new Hono();
 async function authorized(token:string){
  if(!/^[a-f0-9]{64}$/.test(token)||!config.security)return null;
  const row=await sourceRow(db),settings=connectionSettings(row);if(!row?.secret_ciphertext||!settings)return null;
  try{return await same((JSON.parse(await config.security.open(row.secret_ciphertext)) as Sealed).webhookToken,token)?settings:null;}catch{return null;}
 }
 // Mailchimp checks a new webhook address with a GET before saving it.
 app.get('/:token',async c=>{const settings=await authorized(c.req.param('token'));if(!settings)return c.json({error:'Unknown webhook address.'},404);await saveSettings(db,{...settings,webhookCheckedAt:new Date().toISOString()});return c.text('Orbit receives this Mailchimp audience’s unsubscribes here.');});
 app.post('/:token',async c=>{
  const settings=await authorized(c.req.param('token'));if(!settings?.audience)return c.json({error:'Unknown webhook address.'},404);
  let raw:string;
  try{raw=new TextDecoder('utf-8',{fatal:true}).decode(await boundedRequestBody(c.req.raw,65536));}
  catch(error){return c.json({error:error instanceof RequestBodyTooLarge?'Webhook body exceeds 65536 bytes.':'Webhook body must be UTF-8 form data.'},error instanceof RequestBodyTooLarge?413:400);}
  const form=new URLSearchParams(raw),type=form.get('type')??'',firedAt=form.get('fired_at')??'',listId=form.get('data[list_id]')??'';
  if(type==='campaign')return c.json({received:true,recorded:false});
  if(!Object.hasOwn(types,type))return c.json({error:'Unsupported Mailchimp webhook type.'},400);
  if(listId!==settings.audience.id)return c.json({error:'This event belongs to another Mailchimp audience.'},409);
  const kind=type as keyof typeof types,email=(kind==='upemail'?form.get('data[old_email]'):form.get('data[email]'))?.trim()??'';
  const occurred=/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(firedAt)?Date.parse(firedAt.replace(' ','T')+'Z'):Number.NaN;
  if(!email||Number.isNaN(occurred)||occurred>Date.now()+300000)return c.json({error:'The Mailchimp event needs an email address and a valid time.'},400);
  const data={id:form.get('data[id]')??'',action:form.get('data[action]')??'',reason:form.get('data[reason]')??'',newEmail:form.get('data[new_email]')??''};
  // Mailchimp sends no event ID; identity is the event's own content, so a replayed delivery is the same signal.
  const identity=await payloadHash(['mailchimp-webhook-v1',kind,firedAt,listId,email.toLowerCase(),data.id,data.action,data.reason,data.newEmail.toLowerCase()].join('\n'));
  const event:SignalEvent={eventId:`mailchimp:${identity}`,type:types[kind],subject:subjects[kind],email,occurredAt:new Date(Math.min(occurred,Date.now())).toISOString(),...(kind==='cleaned'?{permanentBounce:true}:{}),data:{provider:'mailchimp',mailchimpType:kind,listId,...(data.action?{action:data.action}:{}),...(data.reason?{reason:data.reason}:{}),...(kind==='upemail'?{newEmail:data.newEmail}:{})}};
  const body=JSON.stringify(event);
  try{
   const result=await new IngestionRepository(db).ingest(mailchimpSource,event,await payloadHash(body),body);
   if('replayed' in result)return c.json({received:true,replayed:true});
   const contacts=(await db.prepare("SELECT record_id FROM signal_links WHERE signal_id=? AND record_type='contact'").bind(result.id).all<{record_id:string}>()).results.map(row=>row.record_id);
   const memberId=subscriberHash(email),statements:D1PreparedStatement[]=[];
   for(const contactId of contacts){
    if(kind==='unsubscribe'||kind==='cleaned')statements.push(withdrawalStatement(db,null,contactId,'Mailchimp',subjects[kind]),linkStatement(db,null,contactId,{listId,memberId,uniqueEmailId:data.id||null,status:kind==='cleaned'?'cleaned':'unsubscribed',hash:null,reported:true}));
    // A subscribe is recorded, never trusted to lift a stop; the next handoff reads a stopped contact's member and sets it back to unsubscribed.
    if(kind==='subscribe')statements.push(linkStatement(db,null,contactId,{listId,memberId,uniqueEmailId:data.id||null,status:'subscribed',hash:null,reported:true}));
   }
   if(statements.length)await db.batch(statements);
   return c.json({received:true,signalId:result.id});
  }catch(error){if(error instanceof IngestionError)return c.json({error:error.message},error.status);throw error;}
 });
 return app;
}
