import {useState} from 'react';
import {Link} from '@tanstack/react-router';
import type {ContactContext} from '../../../relationships/contracts';
import {AutosaveField,textProps} from '../autosave/field';
import type {AutosaveForm,Parse} from '../autosave/use-autosave';
import {formatCurrency} from '../formatters';
import {RecordSearchField} from '../record-search-field';
import type {CustomerRecord} from '../records-api';
import {DealRows} from './contact-details';
import {CustomValues,type FieldDefinition} from './custom-values';
import {DetailsGroup} from './details-panel';
import {OwnerField} from './owner-field';
import {contactContextValues,patchRecord,readContext,saveContactContext} from './record-api';

/** A website as the domain Orbit keys companies by. */
const domain:Parse=text=>{const value=text.trim().toLowerCase().replace(/^www\./,'');return !value?{value:null}:/^[a-z0-9.-]+\.[a-z]{2,}$/.test(value)?{value}:{error:'Enter a domain such as harbour-studio.com, without https:// or a path.'};};

/** People: each contact of the company, primary or secondary, and Add a person, which links a contact to it (as their
 * company when they have none, otherwise as another company of theirs). */
function CompanyPeople({id,people,onChanged}:{id:string;people:CustomerRecord[];onChanged:()=>void}){
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function link(contact:CustomerRecord){
  setBusy(true);setError('');
  try{
   if(!contact.company_id)await patchRecord('contact',contact.id,{company_id:id},{company_id:null},{});
   else{const context=contactContextValues(await readContext<ContactContext>('contact',contact.id));await saveContactContext(contact.id,{secondaryCompanies:[...context.secondaryCompanies,{companyId:id,name:'',verified:false,verifiedBy:null,verifiedAt:null}]},context,{});}
   onChanged();
  }catch(e){setError(`Not saved: ${(e as Error).message}`);}finally{setBusy(false);}
 }
 return <DetailsGroup title="People">
  {people.length?<ul className="r-people">{people.map(person=><li className="r-person" key={person.id}><div><Link to="/app/contacts/$id" params={{id:person.id}}>{person.name??person.email}</Link><p>{[person.job_title,person.relationship_primary?'Primary company':'Secondary company'].filter(Boolean).join(' · ')}</p></div></li>)}</ul>:<p className="r-note">No one at this company yet.</p>}
  <RecordSearchField kind="contact" label="Add a person" disabled={busy} exclude={people.map(person=>person.id)} onChoose={contact=>void link(contact)}/>
  {error?<p className="r-fail" role="alert">{error}</p>:null}
 </DetailsGroup>;
}

/** A company's details: its website, owner and own fields; its people; its deals and their open value. */
export function CompanyDetails({id,record,detail,settings,definitions,onSaved}:{id:string;record:AutosaveForm;detail:any;settings:any;definitions:FieldDefinition[];onSaved:()=>void}){
 return <>
  <DetailsGroup label="Company">
   <AutosaveField form={record} field="primary_domain" label="Website" quiet><input placeholder="Add a website" maxLength={500} {...textProps(record,'primary_domain',{parse:domain})}/></AutosaveField>
   <OwnerField kind="company" id={id} ownership={detail.ownership} operators={settings.operators??[]} onSaved={onSaved}/>
   <CustomValues form={record} definitions={definitions} operators={settings.operators??[]}/>
  </DetailsGroup>
  <CompanyPeople id={id} people={detail.contacts} onChanged={onSaved}/>
  <DetailsGroup title="Deals"><DealRows deals={detail.opportunities} workspace={settings.workspace}/><dl className="r-dl"><div><dt>Open value</dt><dd>{formatCurrency(detail.openValueCents??0,settings.workspace)}</dd></div></dl></DetailsGroup>
 </>;
}
