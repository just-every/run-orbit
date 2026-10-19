/** BOUNDARY-001: the separate products a buyer reaches for jobs Orbit does not own, with each one's real state. */
export type ProductState='receiving'|'awaiting-delivery'|'unavailable';
export interface ConnectedProduct {job:string;products:string[];owns:string;clause:string;state:ProductState;lastDeliveryAt:string|null;inOrbit:string}

const unavailable=(job:string,products:string[],owns:string,clause:string,inOrbit:string)=>({job,products,owns,clause,inOrbit});
// Orbit has no connector for these products yet. Each is named unavailable, never shown as connected or simulated.
const unbuilt=[
 unavailable('Booking',['Dial'],'Availability, routing and booking pages','INTEGRATE-001','Dial bookings do not reach Orbit. Record a booked meeting by hand on the deal.'),
 unavailable('Meetings',['Zoom'],'Running meetings, recordings and transcripts','INTEGRATE-002','Zoom meetings do not reach Orbit. Plan meetings and log their outcome on the deal.'),
 unavailable('Calling',['Twilio','Aircall'],'Phone numbers, carrier calls and recordings','CALL-001','Calls cannot be placed from Orbit. Log each call by hand on the deal.'),
 unavailable('Support context',['HappyToHelp','Help Scout','Zendesk'],'Support tickets, replies and SLAs','INTEGRATE-004','No ticket data is shown in Orbit, so an account’s support health is unknown here.'),
 unavailable('Signatures',['DocuSign'],'Signature envelopes and signed documents','QUOTE-001','Orbit has no quotes or signature envelopes. A deal is never marked signed.'),
 unavailable('Billing',['Nectar','Stripe'],'Payments, subscriptions and invoices','INTEGRATE-003','No billing status is shown in Orbit. A payment never marks a deal won.'),
 unavailable('Accounting',['QuickBooks Online','Xero'],'Invoices, ledgers and sales-tax filings','INTEGRATE-006','Orbit sends nothing to accounting and keeps no ledger.'),
 unavailable('Team notifications',['Slack'],'Team channels and messages','INTEGRATE-005','Orbit notifies operators in the app only.'),
 unavailable('Marketing audiences',['Mailchimp'],'Bulk campaigns and marketing automation','INTEGRATE-007','No contacts are sent to Mailchimp. Orbit sends only reviewed one-to-one mail.'),
 unavailable('Post-sale customer success',['Buoy'],'Onboarding, health, adoption and renewals','INTEGRATE-008','Won deals are not handed to Buoy from Orbit.'),
];

/** Booking deliveries are the one connection Orbit ships today: report the last one each vendor actually delivered. */
export async function connectedProducts(db:D1Database):Promise<ConnectedProduct[]>{
 const latest=async(vendor:string)=>(await db.prepare('SELECT max(received_at) AS at FROM signals WHERE source_event_id LIKE ?').bind(`${vendor}:%`).first<{at:string|null}>())?.at??null;
 const booking=await Promise.all([['Calendly','calendly'],['Cal.com','calcom']].map(async([name,vendor])=>{const at=await latest(vendor!);return {job:'Booking',products:[name!],owns:'Availability, routing and booking pages',clause:'INTEGRATE-001',state:(at?'receiving':'awaiting-delivery') as ProductState,lastDeliveryAt:at,inOrbit:at?'Signed bookings and cancellations reach the matched contact’s timeline.':'Set it up under Signal sources. No signed booking has arrived yet.'};}));
 return [...booking,...unbuilt.map(product=>({...product,state:'unavailable' as const,lastDeliveryAt:null}))];
}
