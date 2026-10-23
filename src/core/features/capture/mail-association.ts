import {contactEmailKey} from '../records/identity';
import type {SignalTarget} from '../ingestion/linking-repository';
import type {Fact} from './facts';
import type {Known} from './intake';
import {mailRuleNames,readMailRule,type MailRule} from './mail-rule';

/** Creation is initial activity; source/operator timeline records advance it, scoring machinery does not. */
export const openContactDealsSql=`SELECT o.id,o.title,MAX(o.created_at,COALESCE((SELECT MAX(t.recorded_at) FROM timeline_entry_records tr JOIN timeline_entries t ON t.id=tr.timeline_entry_id WHERE tr.record_type='opportunity' AND tr.record_id=o.id AND t.actor_type IN('source','operator')),o.created_at)) AS activity FROM opportunities o JOIN opportunity_contacts oc ON oc.opportunity_id=o.id WHERE oc.contact_id=? AND o.lifecycle='open' ORDER BY activity DESC,o.id`;
export interface OpenContactDeal{id:string;title:string;activity:string}
export async function openContactDeals(db:D1Database,contactId:string){return (await db.prepare(openContactDealsSql).bind(contactId).all<OpenContactDeal>()).results;}
export async function automaticMailAssociation(db:D1Database,sourceId:string,fact:Fact,known:Known[]){
 if(fact.kind!=='message'||fact.bounce)return null;
 if(!await db.prepare("SELECT 1 FROM capture_sources WHERE id=? AND adapter IN('google','microsoft')").bind(sourceId).first())return null;
 const contacts=[...new Map(known.filter(person=>person.contact).map(person=>[person.contact!.id,person])).values()];
 // Multiple external contacts require review; no subject or name inference selects one.
 if(contacts.length!==1)return null;
 const operators=new Set((await db.prepare('SELECT lower(trim(email)) AS email FROM operators').all<{email:string}>()).results.map(row=>row.email));
 // A second company-only or unknown correspondent is ambiguity, not permission
 // to choose the one known contact by elimination.
 if(fact.participants.some(person=>!operators.has(person.email)&&!known.some(match=>match.email===person.email&&match.contact?.id===contacts[0]!.contact!.id)))return null;
 const person=contacts[0]!,contact=person.contact!,rule=await readMailRule(db),deals=await openContactDeals(db,contact.id);
 if(deals.length>1&&rule==='review')return null;
 const selected=deals.length>1&&rule==='recent'?deals.slice(0,1):deals;
 const applied:MailRule| 'single'|'contact'=deals.length>1?rule:deals.length?'single':'contact';
 const name=applied==='single'?'Only open deal for exact contact':applied==='contact'?'Exact contact with no open deal':mailRuleNames[applied];
 const basis=`Capture mail rule: ${name}`;
 const targets:SignalTarget[]=[{type:'contact',id:contact.id,basis},...(contact.company_id?[{type:'company' as const,id:contact.company_id,basis}]:[]),...selected.map(deal=>({type:'opportunity' as const,id:deal.id,basis}))];
 const ids=deals.map(deal=>deal.id).sort();
 const fences=[db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'capture_rule_current',NULL WHERE NOT EXISTS(SELECT 1 FROM workspace_settings WHERE id='workspace' AND capture_mail_rule=?)").bind(rule),db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'capture_rule_contact',NULL WHERE NOT EXISTS(SELECT 1 FROM contacts c WHERE c.id=? AND c.company_id IS ? AND (c.email_key=? OR EXISTS(SELECT 1 FROM record_aliases a WHERE a.record_type='contact' AND a.survivor_id=c.id AND a.identity_key=?))) OR EXISTS(SELECT 1 FROM operators WHERE lower(trim(email))=?)").bind(contact.id,contact.company_id,contactEmailKey(person.email),contactEmailKey(person.email),person.email),db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'capture_rule_deals',NULL WHERE (SELECT json_group_array(id) FROM (SELECT o.id FROM opportunities o JOIN opportunity_contacts oc ON oc.opportunity_id=o.id WHERE oc.contact_id=? AND o.lifecycle='open' ORDER BY o.id))<>?").bind(contact.id,JSON.stringify(ids))];
 if(applied==='recent')fences.push(db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'capture_rule_activity',NULL WHERE (SELECT id FROM (${openContactDealsSql}) LIMIT 1)<>?`).bind(contact.id,selected[0]!.id));
 return {targets,fences,email:person.email,evidence:{associationRule:name,associationRuleId:applied,associationContactId:contact.id}};
}
