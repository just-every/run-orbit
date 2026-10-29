import {Link} from '@tanstack/react-router';
import type {Stakeholder,StakeholderRole} from '../../../relationships/contracts';
import {ActionTooltip} from '../action-tooltip';
import {SavedLabel} from '../autosave/saved-label';
import {SaveFailure} from '../autosave/save-failure';
import type {AutosaveForm} from '../autosave/use-autosave';
import {DealRisks} from '../deal-risks';
import {RecordSearchField} from '../record-search-field';
import {DetailsGroup} from './details-panel';
import {MenuButton} from './menu-button';

const roleNames:Record<StakeholderRole,string>={champion:'Champion',decision_maker:'Decision-maker',evaluator:'Evaluator',procurement:'Procurement',other:'Other'};
const roles=Object.keys(roleNames) as StakeholderRole[];

/** People: one row per stakeholder (their name, job title and whether they are the primary recipient, their roles as
 * chips with + Role, Unconfirmed until confirmed, and a ⋯ menu), then Add a person, then the deal's things to check.
 * Each change saves the deal's relationships at once. */
export function DealPeople({dealId,form,titles}:{dealId:string;form:AutosaveForm;titles:Map<string,string|null>}){
 const people=(form.value('stakeholders')??[]) as Stakeholder[];
 const save=(next:Stakeholder[])=>form.commit('stakeholders',next);
 const update=(contactId:string,patch:Partial<Stakeholder>)=>save(people.map(person=>person.contactId===contactId?{...person,...patch}:person));
 function remove(contactId:string){const next=people.filter(person=>person.contactId!==contactId);if(next.length&&!next.some(person=>person.isPrimary))next[0]={...next[0]!,isPrimary:true};save(next);}
 const status=form.status('stakeholders');
 return <DetailsGroup title="People">
  <SavedLabel show={form.saved('stakeholders')}/>
  {people.length?<ul className="r-people" aria-label="People on this deal">{people.map(person=>{const name=person.name??person.email??'A contact';return <li className="r-person" key={person.contactId}>
   <div><Link to="/app/contacts/$id" params={{id:person.contactId}}>{name}</Link><p>{[titles.get(person.contactId),person.isPrimary?'Primary recipient':null,person.contactability==='do_not_contact'?'Do not contact':null].filter(Boolean).join(' · ')||'No job title'}</p></div>
   <div className="r-person-meta">
    {person.roles.map(role=><span className="r-role" key={role}>{roleNames[role]}<ActionTooltip label={`Remove ${roleNames[role]} role`}><button type="button" className="r-chip-remove" onClick={()=>update(person.contactId,{roles:person.roles.filter(item=>item!==role)})}><span aria-hidden="true">×</span></button></ActionTooltip></span>)}
    {!person.verified?<button type="button" className="r-flag" title="I confirm this stakeholder relationship" aria-label={`Unconfirmed: confirm ${name} on this deal`} onClick={()=>update(person.contactId,{verified:true,verifiedAt:null,verifiedBy:null})}>Unconfirmed</button>:null}
    <MenuButton className="r-role-add" label="+ Role" choices={roles.map(role=>({label:roleNames[role],checked:person.roles.includes(role),onChoose:()=>update(person.contactId,{roles:person.roles.includes(role)?person.roles.filter(item=>item!==role):[...person.roles,role]})}))}/>
    <MenuButton className="r-more" tooltip={`More for ${name}`} label={<span aria-hidden="true">⋯</span>} choices={[...(person.isPrimary?[]:[{label:'Make primary recipient',onChoose:()=>save(people.map(item=>({...item,isPrimary:item.contactId===person.contactId})))}]),{label:'Remove from deal',onChoose:()=>remove(person.contactId)}]}/>
   </div>
  </li>;})}</ul>:<p className="r-note">No one on this deal yet.</p>}
  <SaveFailure status={status} onRetry={()=>form.retry('stakeholders')} onDiscard={()=>form.discard('stakeholders')} onUseMine={()=>form.useMine('stakeholders')} describe={value=>((value??[]) as Stakeholder[]).map(person=>person.name??person.email).join(', ')||'no one'}/>
  <RecordSearchField kind="contact" label="Add a person" placeholder="Add a person" exclude={people.map(person=>person.contactId)} onChoose={contact=>save([...people,{contactId:contact.id,name:contact.name??null,email:contact.email??null,contactability:contact.contactability??'',isPrimary:!people.length,roles:[],verified:false,verifiedBy:null,verifiedAt:null}])}/>
  <DealRisks dealId={dealId}/>
 </DetailsGroup>;
}
