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
const order=['name','title','email','phone','job_title','company_id','primary_domain','stage_id','value_cents','expected_close_at','timezone','contactability'];
/** One order for every list of fields, so the owner's grant and the collaborator's view read alike. */
export const fieldRank=(field:string)=>field.startsWith('custom_fields_json')?order.length+1:order.includes(field)?order.indexOf(field):order.length;
const customPrefix='custom_fields_json.';
/** A list of granted or editable fields in words: "Phone, Job title, Custom fields (Seats)". */
export function fieldListLabel(fields:readonly string[]){
 const custom=fields.filter(field=>field.startsWith(customPrefix)).map(field=>fieldLabel(field.slice(customPrefix.length)));
 const plain=[...new Set(fields.filter(field=>!field.startsWith(customPrefix)))].sort((a,b)=>fieldRank(a)-fieldRank(b)).map(field=>field==='custom_fields_json'&&custom.length?`Custom fields (${custom.join(', ')})`:grantFieldLabel(field));
 if(custom.length&&!fields.includes('custom_fields_json'))plain.push(`Custom fields (${custom.join(', ')})`);
 return plain.join(', ');
}
