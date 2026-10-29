import {useCallback,useMemo,useState} from 'react';
import {Link} from '@tanstack/react-router';
import {AutosaveField,choiceProps,labelId,textProps} from '../autosave/field';
import {InlineConfirm} from '../autosave/inline-confirm';
import {useAutosave,type AutosaveForm,type Parse,type Values} from '../autosave/use-autosave';
import {DoNotContactReason} from '../do-not-contact-reason';
import {formatCurrency} from '../formatters';
import {RecordSearchField} from '../record-search-field';
import {CompanyField} from './company-field';
import {CustomValues,type FieldDefinition} from './custom-values';
import {DetailsGroup} from './details-panel';
import {OwnerField} from './owner-field';
import {patchRecord,readRecord,saveRequest,type ContactContextValues} from './record-api';
import type {RecordDeal} from './record-next-action';

const zones=(()=>{try{return Intl.supportedValuesOf('timeZone');}catch{return [] as string[];}})();
/** An email, or nothing when the contact keeps a name; a contact needs one or the other. */
export const emailParse=(name:()=>string):Parse=>text=>{const value=text.trim();if(!value)return name().trim()?{value:null}:{error:'A contact needs a name or an email.'};return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)?{value}:{error:'Enter an email address such as name@company.example.'};};

/** Deals: each deal's title as a link, then its stage, value and owner. */
export function DealRows({deals,workspace}:{deals:RecordDeal[];workspace:any}){
 return deals.length?<ul className="r-deal-rows">{deals.map(deal=><li key={deal.id}><Link to="/app/opportunities/$id" params={{id:deal.id}}>{deal.title}</Link><p>{[deal.lifecycle==='open'?deal.stage_name:deal.lifecycle==='won'?'Won':'Lost',formatCurrency(deal.value_cents,workspace),deal.owner_name??'Unassigned'].filter(Boolean).join(' · ')}</p></li>)}</ul>:<p className="r-note">No deals yet.</p>;
}

/** Email permission (RECORD-012): Do not contact asks once and stops their scheduled mail; going back to Contactable is
 * the reviewed clear-do-not-contact action, asking once with its own words. */
function PermissionField({id,name,row,onSaved}:{id:string;name:string;row:Values;onSaved:()=>void}){
 const copy=useMemo(()=>({contactability:row.contactability,email:row.email,updated_at:row.updated_at,contactability_revision:row.contactability_revision}),[row.contactability,row.email,row.updated_at,row.contactability_revision]);
 const send=useCallback(async(changes:Values,base:Values,current:Values,init:{keepalive?:boolean})=>{
  if(changes.contactability==='do_not_contact'){const answer=await patchRecord('contact',id,{contactability:'do_not_contact'},{contactability:base.contactability},init);return {copy:{...current,...answer.copy},changed:answer.changed};}
  await saveRequest(`records/contact/${id}/clear-do-not-contact`,'POST',{confirmed:true,email:current.email??null,updatedAt:current.updated_at,revision:current.contactability_revision},init);
  const fresh=(await readRecord<{record:Values}>('contact',id)).record;
  return {copy:{contactability:fresh.contactability,email:fresh.email,updated_at:fresh.updated_at,contactability_revision:fresh.contactability_revision},changed:true};
 },[id]);
 const form=useAutosave<Values>({key:`permission.${id}`,copy,version:value=>value.updated_at,send,reread:async()=>{const fresh=(await readRecord<{record:Values}>('contact',id)).record;return {contactability:fresh.contactability,email:fresh.email,updated_at:fresh.updated_at,contactability_revision:fresh.contactability_revision};},onSaved});
 const [asking,setAsking]=useState<string|null>(null),saved=String(form.value('contactability')??'contactable');
 const keep=()=>setAsking(null);
 return <AutosaveField form={form} field="contactability" label="Email permission" quiet describe={value=>value==='do_not_contact'?'Do not contact':'Contactable'}
  after={<>{asking==='do_not_contact'?<InlineConfirm sentence={`Stop all mail to ${name}? Their scheduled follow-ups are cancelled.`} action="Stop mail" keep="Keep contactable" onConfirm={()=>{form.commit('contactability','do_not_contact');keep();}} onKeep={keep}/>:null}
   {asking==='contactable'?<InlineConfirm sentence={`Clear do-not-contact for ${row.email??name}? Future messages will require a new operator review. Cancelled messages stay cancelled.`} action="Clear do-not-contact" keep="Keep do not contact" onConfirm={()=>{form.commit('contactability','contactable');keep();}} onKeep={keep}/>:null}
   {saved==='do_not_contact'&&!asking?<DoNotContactReason record={row}/>:null}</>}>
  <select aria-labelledby={labelId(form,'contactability')} value={asking??saved} onChange={event=>setAsking(event.target.value===saved?null:event.target.value)}><option value="contactable">Contactable</option><option value="do_not_contact">Do not contact</option></select>
 </AutosaveField>;
}

/** Other companies: the contact's secondary companies, each confirmable and removable, and Add a company. */
function OtherCompanies({form,primary}:{form:AutosaveForm;primary:string|null}){
 const companies=(form.value('secondaryCompanies')??[]) as ContactContextValues['secondaryCompanies'];
 const save=(next:typeof companies)=>form.commit('secondaryCompanies',next);
 return <DetailsGroup title="Other companies">
  {companies.length?<ul className="r-people">{companies.map(company=><li className="r-person" key={company.companyId}><div><Link to="/app/companies/$id" params={{id:company.companyId}}>{company.name}</Link></div><div className="r-person-meta">
   {!company.verified?<button type="button" className="r-flag" aria-label={`Unconfirmed: confirm ${company.name}`} onClick={()=>save(companies.map(item=>item.companyId===company.companyId?{...item,verified:true,verifiedAt:null,verifiedBy:null}:item))}>Unconfirmed</button>:null}
   <button type="button" className="operator-text-button" onClick={()=>save(companies.filter(item=>item.companyId!==company.companyId))}>Remove</button>
  </div></li>)}</ul>:null}
  <RecordSearchField kind="company" label="Add a company" exclude={[...companies.map(item=>item.companyId),...(primary?[primary]:[])]} onChoose={company=>save([...companies,{companyId:company.id,name:company.name??'',verified:false,verifiedBy:null,verifiedAt:null}])}/>
 </DetailsGroup>;
}

/** A contact's details: how to reach them, where they work, who owns them, whether they may be emailed and their own
 * fields; then their deals and other companies. */
export function ContactDetails({id,record,detail,settings,definitions,context,onSaved}:{id:string;record:AutosaveForm;detail:any;settings:any;definitions:FieldDefinition[];context:AutosaveForm;onSaved:()=>void}){
 const row=detail.record,name=String(record.value('name')??row.name??row.email??'this contact');
 const workspaceZone=settings.workspace?.timezone??'';
 return <>
  <DetailsGroup label="Contact">
   <AutosaveField form={record} field="email" label="Email" quiet><input type="email" placeholder="Add an email" {...textProps(record,'email',{parse:emailParse(()=>String(record.value('name')??''))})}/></AutosaveField>
   <AutosaveField form={record} field="phone" label="Phone" quiet><input type="tel" placeholder="Add a phone" maxLength={500} {...textProps(record,'phone',{parse:text=>({value:text.trim()||null})})}/></AutosaveField>
   <AutosaveField form={record} field="job_title" label="Job title" quiet><input placeholder="Add a job title" maxLength={500} {...textProps(record,'job_title',{parse:text=>({value:text.trim()||null})})}/></AutosaveField>
   <AutosaveField form={record} field="timezone" label="Time zone" quiet describe={value=>String(value||`the workspace's (${workspaceZone})`)}><select {...choiceProps(record,'timezone',value=>value||null)}><option value="">Workspace ({workspaceZone})</option>{zones.map(zone=><option key={zone} value={zone}>{zone}</option>)}</select></AutosaveField>
   <CompanyField form={record} field="company_id" name={detail.company?.name??''}/>
   <OwnerField kind="contact" id={id} ownership={detail.ownership} operators={settings.operators??[]} onSaved={onSaved}/>
   <PermissionField id={id} name={name} row={row} onSaved={onSaved}/>
   <CustomValues form={record} definitions={definitions} operators={settings.operators??[]}/>
  </DetailsGroup>
  <DetailsGroup title="Deals"><DealRows deals={detail.opportunities} workspace={settings.workspace}/></DetailsGroup>
  <OtherCompanies form={context} primary={row.company_id??null}/>
 </>;
}
