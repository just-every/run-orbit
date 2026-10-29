import type {RecordRef,RecordType} from './types';

const recordPaths:Record<RecordRef['type'],string>={opportunity:'/app/opportunities',contact:'/app/contacts',company:'/app/companies'};
export const recordHref=(ref:RecordRef)=>`${recordPaths[ref.type]}/${ref.id}`;
export const entryHref=(ref:RecordRef,entryId:string|null)=>recordHref(ref)+(entryId?`#entry-${entryId}`:'');
export const planHref=(signalId:string)=>`/app/meetings/${signalId}`;
/** Where an application reads a signal it selected: a line resting on no record it may see links here. */
export const signalEvidenceHref=(signalId:string)=>`/api/delegation/v1/evidence?target=signals/${signalId}`;
export const delegationTarget=(ref:RecordRef)=>`${{contact:'contacts',company:'companies',opportunity:'opportunities'}[ref.type]}/${ref.id}`;

export interface RecordIndex {
 opportunities:Map<string,{id:string;title:string;company_id:string|null;lifecycle:string}>;
 companies:Map<string,{id:string;name:string}>;
 contacts:Map<string,{id:string;name:string|null;email:string|null;company_id:string|null}>;
}

/** Loads every referenced record, plus the companies they belong to, in three reads. */
export async function indexRecords(db:D1Database,refs:RecordRef[]):Promise<RecordIndex>{
 const ids=(type:RecordType)=>JSON.stringify([...new Set(refs.filter(ref=>ref.type===type).map(ref=>ref.id))]);
 const [opportunities,contacts]=await Promise.all([
  db.prepare('SELECT id,title,company_id,lifecycle FROM opportunities WHERE id IN (SELECT value FROM json_each(?))').bind(ids('opportunity')).all<{id:string;title:string;company_id:string|null;lifecycle:string}>(),
  db.prepare('SELECT id,name,email,company_id FROM contacts WHERE id IN (SELECT value FROM json_each(?))').bind(ids('contact')).all<{id:string;name:string|null;email:string|null;company_id:string|null}>()]);
 const companyIds=[...new Set([...JSON.parse(ids('company')) as string[],...opportunities.results.map(row=>row.company_id),...contacts.results.map(row=>row.company_id)].filter((id):id is string=>Boolean(id)))];
 const companies=await db.prepare('SELECT id,name FROM companies WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(companyIds)).all<{id:string;name:string}>();
 return {opportunities:new Map(opportunities.results.map(row=>[row.id,row])),contacts:new Map(contacts.results.map(row=>[row.id,row])),companies:new Map(companies.results.map(row=>[row.id,row]))};
}

/** Keeps only references to records that still exist. */
export const existing=(index:RecordIndex,refs:RecordRef[])=>refs.filter(ref=>(ref.type==='opportunity'?index.opportunities:ref.type==='company'?index.companies:index.contacts).has(ref.id));

/** The account a line belongs to: its company when one is known, otherwise its opportunity, otherwise its contact.
 * An opportunity's read carries its company; a contact's carries only the company id, so its company names the account only when `named` allows it. */
export function accountFor(index:RecordIndex,refs:RecordRef[],named:(ref:RecordRef)=>boolean=()=>true):RecordRef|null{
 const company=refs.find(ref=>ref.type==='company')?.id
  ??refs.filter(ref=>ref.type==='opportunity').map(ref=>index.opportunities.get(ref.id)?.company_id).find(Boolean)
  ??refs.filter(ref=>ref.type==='contact').map(ref=>index.contacts.get(ref.id)?.company_id).find(id=>id&&named({type:'company',id}));
 if(company&&index.companies.has(company))return {type:'company',id:company};
 return refs.find(ref=>ref.type==='opportunity')??refs.find(ref=>ref.type==='contact')??null;
}

export function recordName(index:RecordIndex,ref:RecordRef){
 if(ref.type==='company')return index.companies.get(ref.id)?.name??'Company';
 if(ref.type==='opportunity')return index.opportunities.get(ref.id)?.title??'Opportunity';
 const contact=index.contacts.get(ref.id);return contact?.name??contact?.email??'Contact';
}
