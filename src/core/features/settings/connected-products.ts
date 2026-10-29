import {slackStatus} from '../slack/installation';
import {connection as mailchimpConnection,ownership as mailchimpOwnership} from '../marketing/connection';
/** BOUNDARY-001: the products Orbit connects to, each with its real state. Products Orbit does not connect to are named
 * in the docs, never listed here as a connection or a substitute. */
export type ProductState='receiving'|'awaiting-delivery'|'connected'|'unresolved-setup';
export interface ConnectedProduct {job:string;products:string[];owns:string;clause:string;state:ProductState;lastDeliveryAt:string|null;inOrbit:string;link?:{href:string;label:string}}

/** Real connector state only; unresolved setup never masquerades as connected. */
export async function connectedProducts(db:D1Database):Promise<ConnectedProduct[]>{
 const latest=async(vendor:string)=>(await db.prepare('SELECT max(received_at) AS at FROM signals WHERE source_event_id LIKE ?').bind(`${vendor}:%`).first<{at:string|null}>())?.at??null;
 const booking=await Promise.all([['Calendly','calendly'],['Cal.com','calcom']].map(async([name,vendor])=>{const at=await latest(vendor!);return {job:'Booking',products:[name!],owns:'Availability, routing and booking pages',clause:'INTEGRATE-001',state:(at?'receiving':'awaiting-delivery') as ProductState,lastDeliveryAt:at,inOrbit:at?'Signed bookings and cancellations reach the matched contact’s timeline.':'No signed booking has arrived yet.'};}));
 const slack=await slackStatus(db),configured=slack.installation?.state==='connected';
 const notices={job:'Team notifications',products:['Slack'],owns:'Team channels and messages',clause:'INTEGRATE-005',state:(configured?'connected':'unresolved-setup') as ProductState,lastDeliveryAt:slack.notices.find((n:any)=>n.state==='sent')?.updated_at as string??null,inOrbit:configured?'Allowed-field sales notices and mapped internal actions. Configure channels and inspect notice status below.':`Notices paused. ${slack.installation?.error??'Connect the bot and app signing secret below.'}`};
 const mailchimp=await mailchimpConnection(db),audience=mailchimp.settings?.audience;
 const marketing:ConnectedProduct={job:'Marketing audiences',products:['Mailchimp'],owns:'Bulk campaigns and marketing automation',clause:'INTEGRATE-007',state:mailchimp.state,lastDeliveryAt:mailchimp.lastEventAt,inOrbit:mailchimp.state==='connected'?`${mailchimpOwnership} Orbit hands only contacts with recorded consent to the audience “${audience!.name}” and receives its unsubscribes.`:`Handoff paused. ${mailchimp.reason}`,...(mailchimp.state==='connected'&&mailchimp.link?{link:{href:mailchimp.link,label:'Open the audience in Mailchimp'}}:{})};
 return [notices,...booking,marketing];
}
