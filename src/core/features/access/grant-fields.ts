import {fieldLabel} from '../operator/ui/data-value';
/** Storage columns a person never grants by hand: identifiers, derived keys and bookkeeping. */
const technical=new Set(['id','created_at','updated_at','email_key','primary_domain_key','contactability_revision','revision','score','band','queue_state','queue_reason','lifecycle']);
const labels:Record<string,string>={custom_fields_json:'Custom fields',company_id:'Company',stage_id:'Stage',owner_id:'Owner',value_cents:'Value (in cents)',expected_close_at:'Expected close date',primary_domain:'Website domain'};
export const grantFieldLabel=(field:string)=>labels[field]??fieldLabel(field);
/** The fields of a chosen record that a grant can name, in the record's own order. */
export function grantableFields(fields:Record<string,unknown>){return Object.keys(fields).filter(field=>!technical.has(field)&&/^[a-z_][a-z0-9_.]*$/.test(field));}
export const recordKinds=[{value:'contact',label:'Contact'},{value:'company',label:'Company'},{value:'opportunity',label:'Opportunity'}] as const;
/** How a record reads in a picker or a grant list: its name, plus a contact's email. */
export function recordName(fields:Record<string,unknown>){
 const name=String(fields.name??fields.title??'Unnamed record');
 return typeof fields.email==='string'&&fields.email?`${name} · ${fields.email}`:name;
}
