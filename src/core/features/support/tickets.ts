import {guard} from '../identity/store';
import {company,authorityGuard,endGuard} from './authority';
import {connectionGuard,openConnection,providerCall} from './connection';
import {mapping,mappingGuard} from './mapping';
import {SupportError,organizationLink,ticketLink,type Actor,type SupportConfig,type Ticket} from './contracts';
import {ZendeskFailure} from './provider';
export function ticketSummary(ticket:Ticket,subdomain:string,id:string,organizationId:string){
 if(!ticket||String(ticket.id)!==id||String(ticket.organization_id)!==organizationId||typeof ticket.subject!=='string'||!['new','open','pending','hold','solved','closed'].includes(ticket.status)||!['low','normal','high','urgent',null].includes(ticket.priority)||!Number.isFinite(Date.parse(ticket.updated_at)))throw new SupportError(502,'Zendesk returned an unavailable ticket summary.');
 return{id,summary:ticket.subject.slice(0,500),severity:ticket.priority,status:ticket.status,lastUpdate:ticket.updated_at,link:ticketLink(subdomain,id),state:'available' as const};
}
/** Only live provider projections leave this boundary; descriptions, comments and attachments never do. */
export async function tickets(db:D1Database,config:SupportConfig,actor:Actor,companyId:string){
 await company(db,actor,companyId);
 let connection;try{connection=await openConnection(db,config);}catch(error){if(error instanceof SupportError&&error.status===409)return{state:'unavailable',reason:error.message,tickets:[]};throw error;}
 let mapped;try{mapped=await mapping(db,companyId,connection);}catch(error){if(error instanceof SupportError)return{state:'unavailable',reason:error.message,tickets:[]};throw error;}
 const subdomain=connection.installation.subdomain;
 const unavailable=(reason:string)=>({state:'unavailable',reason,tickets:[],organization:{id:mapped.organization_id,name:mapped.organization_name,link:organizationLink(subdomain,mapped.organization_id)}});
 try{
  const known=(await db.prepare('SELECT ticket_id FROM support_tickets WHERE company_id=? AND subdomain=?').bind(companyId,subdomain).all<{ticket_id:string}>()).results.map(row=>row.ticket_id);
  const erased=new Set((await db.prepare("SELECT ticket_id FROM support_handoffs WHERE state='redacted' AND subdomain=? AND ticket_id IS NOT NULL").bind(subdomain).all<{ticket_id:string}>()).results.map(row=>row.ticket_id));
  const list=await providerCall<{tickets:{id:number}[];next_page?:string|null}>(db,config,connection,`/api/v2/organizations/${mapped.organization_id}/tickets.json?per_page=100`);
  if(!Array.isArray(list.tickets)||list.tickets.some(t=>!Number.isSafeInteger(t.id)||t.id<1))return unavailable('Zendesk did not return a verifiable ticket list.');
  const ids=[...new Set([...known,...list.tickets.map(t=>String(t.id))])].filter(id=>!erased.has(id));
  const result=[];
  for(const id of ids.slice(0,200)){
   try{const {ticket}=await providerCall<{ticket:Ticket}>(db,config,connection,`/api/v2/tickets/${id}.json`);result.push(ticketSummary(ticket,subdomain,id,mapped.organization_id));}
   catch(error){if(error instanceof ZendeskFailure&&[403,404].includes(error.status)||error instanceof SupportError&&error.status===502)result.push({id,state:'unavailable' as const,reason:'This ticket was deleted or is no longer readable.'});else throw error;}
  }
  await company(db,actor,companyId);
  await db.batch([authorityGuard(db,actor),connectionGuard(db,connection),mappingGuard(db,mapped),guard(db,{sql:"NOT EXISTS(SELECT 1 FROM support_handoffs WHERE state='redacted' AND subdomain=? AND ticket_id IN(SELECT value FROM json_each(?)))",args:[subdomain,JSON.stringify(ids.filter(id=>!erased.has(id)))]}),...ids.slice(0,200).map(id=>db.prepare('INSERT OR IGNORE INTO support_tickets VALUES(?,?,?)').bind(companyId,id,subdomain)),endGuard(db)]);
  const incomplete=Boolean(list.next_page)||ids.length>200;
  return{state:result.some(row=>row.state==='unavailable')||incomplete?'unavailable':'available',reason:incomplete?'More tickets are available in Zendesk. This is a partial list.':result.some(row=>row.state==='unavailable')?'Some tickets are unavailable; this does not indicate a healthy account.':null,organization:{id:mapped.organization_id,name:mapped.organization_name,link:organizationLink(subdomain,mapped.organization_id)},tickets:result};
 }catch(error){if(error instanceof ZendeskFailure){await company(db,actor,companyId);return unavailable(error.status===401?'Zendesk refused the saved token. Reconnect in Settings.':'Zendesk tickets cannot currently be verified.');}throw error;}
}
