import { z } from 'zod';
export const kinds = ['suppression','company','contact','deal','note'] as const;
export type ImportKind = typeof kinds[number];
export const importInput = z.object({
 vendor:z.enum(['hubspot','pipedrive']), account:z.string().trim().min(1).max(100),
 files:z.array(z.object({kind:z.enum(kinds),name:z.string().min(1).max(150),csv:z.string().max(2_000_000),mapping:z.record(z.string().max(60),z.string().max(200)),separator:z.enum([';',',','|']).default(';')}).strict()).min(1).max(5),
 stages:z.record(z.string().max(200),z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/)).default({}),
 contactability:z.enum(['mapped_permission','confirmed_contactable']).default('mapped_permission'),
}).strict();
export type ImportInput=z.infer<typeof importInput>;
export const fields:Record<ImportKind,string[]>={suppression:['id','email','reason'],company:['id','name','domain','owner','description'],contact:['id','name','first_name','last_name','email','phone','job_title','company_ids','company_name','owner','dnc','bounce','quarantined','permission'],deal:['id','title','company_ids','contact_ids','stage','owner','amount','close_date','description'],note:['id','text','occurred_at','contact_ids','company_ids','deal_ids','owner']};
export const presets:Record<string,Record<ImportKind,Record<string,string>>>={
 hubspot:{suppression:{email:'Email'},company:{id:'Record ID',name:'Name',domain:'Company domain name',owner:'Company owner',description:'Description'},contact:{id:'Record ID',first_name:'First Name',last_name:'Last Name',email:'Email',phone:'Phone Number',company_name:'Company Name',company_ids:'Associated Company IDs',owner:'Contact owner',dnc:'Unsubscribed from all email',bounce:'Email hard bounce reason',quarantined:'Email address quarantined'},deal:{id:'Record ID',title:'Deal name',stage:'Deal stage',owner:'Deal owner',company_ids:'Associated Company IDs',contact_ids:'Associated Contact IDs',amount:'Amount',close_date:'Close date',description:'Deal description'},note:{id:'Note ID',text:'hs_note_body',occurred_at:'hs_timestamp',owner:'hubspot_owner_id',contact_ids:'Contact IDs',company_ids:'Company IDs',deal_ids:'Deal IDs'}},
 pipedrive:{suppression:{email:'Email'},company:{id:'Organization - ID',name:'Organization - Name',domain:'Domain',owner:'Owner',description:'Description'},contact:{id:'Person - ID',name:'Person - Name',email:'Email',company_ids:'Organization - ID',owner:'Owner',dnc:'Do not contact',permission:'Marketing status'},deal:{id:'Deal - ID',title:'Deal - Title',stage:'Stage',owner:'Owner',company_ids:'Organization - ID',contact_ids:'Person - ID',amount:'Value',close_date:'Expected close date'},note:{id:'Note ID',text:'Content',occurred_at:'Add time',contact_ids:'Person - ID',company_ids:'Organization - ID',deal_ids:'Deal - ID',owner:'Owner'}}
};

/** Match standard export labels without depending on the exporter’s capitalization. */
export function defaultMapping(vendor:ImportInput['vendor'],kind:ImportKind,headers:string[]){
 return Object.fromEntries(Object.entries(presets[vendor][kind]).flatMap(([field,expected])=>{
  const matches=headers.filter(header=>header.trim().toLowerCase()===expected.toLowerCase());
  return matches.length===1?[[field,matches[0]]]:[];
 }));
}
