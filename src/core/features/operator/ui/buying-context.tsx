import {useEffect,useState} from 'react';
import type {ContactContext,OpportunityContext,StakeholderRole} from '../../relationships/contracts';
import type {RecordKind} from './records-api';
import './buying-context.css';

type Context=ContactContext|OpportunityContext;
type Option={id:string;name:string|null;email?:string|null;contactability?:string};
const roleLabels:Record<StakeholderRole,string>={champion:'Champion',decision_maker:'Decision-maker',evaluator:'Evaluator',procurement:'Procurement',other:'Other'};
const roles=Object.keys(roleLabels) as StakeholderRole[];
async function request<T>(path:string,method='GET',body?:unknown,signal?:AbortSignal):Promise<T>{
 const response=await fetch(`/api/v1/${path}`,{method,credentials:'same-origin',signal,...(body===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
 const payload=await response.json() as T&{error?:string};
 if(!response.ok)throw new Error(payload.error??'The relationship request failed. Reload to inspect the saved state.');
 return payload;
}
function Verification({verified,verifiedAt}:{verified:boolean;verifiedAt:string|null}){
 return <span className={`buying-context__verification ${verified?'is-verified':''}`} title={verifiedAt?`Confirmed ${new Date(verifiedAt).toLocaleString()}`:undefined}>{verified?'Verified':'Unconfirmed'}</span>;
}

/** Full native operators use the same API access boundary as the record editor. */
export function BuyingContext({kind,recordId,onChanged}:{kind:RecordKind;recordId:string;onChanged?:()=>void}){
 return kind==='company'?null:<BuyingContextEditor kind={kind} recordId={recordId} onChanged={onChanged}/>;
}
function BuyingContextEditor({kind,recordId,onChanged}:{kind:'contact'|'opportunity';recordId:string;onChanged?:()=>void}){
 const [value,setValue]=useState<Context|null>(null),[productsText,setProductsText]=useState('');
 const [query,setQuery]=useState(''),[options,setOptions]=useState<Option[]>([]),[companyQuery,setCompanyQuery]=useState(''),[companies,setCompanies]=useState<Option[]>([]);
 const [loading,setLoading]=useState(true),[searching,setSearching]=useState(false),[pending,setPending]=useState(false),[error,setError]=useState(''),[searchError,setSearchError]=useState(''),[saved,setSaved]=useState(false);
 const path=`relationships/${kind}/${recordId}`;
 function receive(context:Context){setValue(context);if(context.kind==='opportunity')setProductsText(context.products.join('\n'));}
 useEffect(()=>{
  const controller=new AbortController();setLoading(true);setValue(null);setError('');setSaved(false);setQuery('');setCompanyQuery('');
  void request<Context>(path,'GET',undefined,controller.signal).then(context=>{if(!controller.signal.aborted)receive(context);}).catch(error=>{if(!controller.signal.aborted)setError((error as Error).message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[path]);
 useEffect(()=>{
  const controller=new AbortController();setSearching(true);setSearchError('');setOptions([]);
  void request<{records:Option[]}>(`records/${kind==='opportunity'?'contact':'company'}?${new URLSearchParams({q:query})}`,'GET',undefined,controller.signal)
   .then(result=>{if(!controller.signal.aborted)setOptions(result.records);}).catch(error=>{if(!controller.signal.aborted)setSearchError((error as Error).message);}).finally(()=>{if(!controller.signal.aborted)setSearching(false);});
  return()=>controller.abort();
 },[kind,query,recordId]);
 useEffect(()=>{
  if(kind!=='opportunity')return;
  const controller=new AbortController();setCompanies([]);
  void request<{records:Option[]}>(`records/company?${new URLSearchParams({q:companyQuery})}`,'GET',undefined,controller.signal)
   .then(result=>{if(!controller.signal.aborted)setCompanies(result.records);}).catch(error=>{if(!controller.signal.aborted)setSearchError((error as Error).message);});
  return()=>controller.abort();
 },[kind,companyQuery,recordId]);
 function edit(next:Context){setValue(next);setSaved(false);}
 async function reload(){setPending(true);setError('');setSaved(false);try{receive(await request<Context>(path));}catch(error){setError((error as Error).message);}finally{setPending(false);}}
 async function save(){
  if(!value)return;setPending(true);setError('');setSaved(false);
  const body=value.kind==='opportunity'?{
   revision:value.revision,companyId:value.company?.id??null,primaryContactId:value.stakeholders.find(item=>item.isPrimary)?.contactId??null,
   stakeholders:value.stakeholders.map(({contactId,roles,verified})=>({contactId,roles,verified})),
   products:productsText.split('\n').map(item=>item.trim()).filter(Boolean),nextStep:value.nextStep,mutualCommitments:value.mutualCommitments
  }:{revision:value.revision,secondaryCompanies:value.secondaryCompanies.map(({companyId,verified})=>({companyId,verified}))};
  try{receive(await request<Context>(path,'PUT',body));setSaved(true);onChanged?.();}catch(error){setError((error as Error).message);}finally{setPending(false);}
 }
 const available=options.filter(option=>value?.kind==='opportunity'?!value.stakeholders.some(item=>item.contactId===option.id):value?.kind==='contact'?value.primaryCompany?.id!==option.id&&!value.secondaryCompanies.some(item=>item.companyId===option.id):false);
 return <section className="operator-surface operator-detail__section buying-context" aria-label={kind==='opportunity'?'Deal stakeholders and buying context':'Company relationships'}>
  <h2>{kind==='opportunity'?'Stakeholders & buying context':'Company relationships'}</h2>
  {loading?<p role="status">Loading relationships…</p>:null}
  {error?<p className="buying-context__error" role="alert">{error}</p>:null}
  {value?<form onSubmit={event=>{event.preventDefault();void save();}}>
   <fieldset disabled={pending} className="buying-context__fields">
    <p className="buying-context__help">Verification records your explicit confirmation. Roles and company relationships do not grant permission to contact someone.</p>
    {value.kind==='opportunity'?<DealBuyingFields value={value} onChange={edit} companies={companies} companyQuery={companyQuery} onCompanyQuery={setCompanyQuery} productsText={productsText} onProductsText={text=>{setProductsText(text);setSaved(false);}}/>:<ContactCompanies value={value} onChange={edit}/>}
    <div className="buying-context__search">
     <label>{kind==='opportunity'?'Find a contact to associate':'Find a secondary company'}<input type="search" value={query} maxLength={500} onChange={event=>setQuery(event.target.value)}/></label>
     {searchError?<p role="alert">{searchError}</p>:searching?<p role="status">Searching…</p>:<>
      <ul className="buying-context__options" aria-label={kind==='opportunity'?'Available contacts':'Available companies'}>{available.map(option=><li key={option.id}>
       <span>{option.name??option.email}{option.name&&option.email?<small>{option.email}</small>:null}{option.contactability?<small>{option.contactability==='do_not_contact'?'Do not contact':option.contactability==='contactable'?'Contactable':'Contact permission unavailable'}</small>:null}</span>
       <button type="button" onClick={()=>{
        if(value.kind==='opportunity')edit({...value,stakeholders:[...value.stakeholders,{contactId:option.id,name:option.name,email:option.email??null,contactability:option.contactability??'',isPrimary:value.stakeholders.length===0,roles:[],verified:false,verifiedBy:null,verifiedAt:null}]});
        else edit({...value,secondaryCompanies:[...value.secondaryCompanies,{companyId:option.id,name:option.name??'',verified:false,verifiedBy:null,verifiedAt:null}]});
       }}>Add {kind==='opportunity'?'stakeholder':'company'}</button>
      </li>)}</ul>{!available.length?<p>{query?'No available matches.':'No further records in these results. Search by name or email.'}</p>:null}
     </>}
    </div>
   </fieldset>
   <div className="buying-context__actions"><button type="button" disabled={pending} onClick={()=>void reload()}>Reload saved context</button><button type="submit" className="operator-button" disabled={pending}>{pending?'Working…':'Save relationships & context'}</button>{saved?<p role="status">Relationships and context saved.</p>:null}</div>
  </form>:!loading?<button type="button" disabled={pending} onClick={()=>void reload()}>Reload relationships</button>:null}
 </section>;
}

function DealBuyingFields({value,onChange,companies,companyQuery,onCompanyQuery,productsText,onProductsText}:{value:OpportunityContext;onChange:(value:OpportunityContext)=>void;companies:Option[];companyQuery:string;onCompanyQuery:(query:string)=>void;productsText:string;onProductsText:(text:string)=>void}){
 const companyOptions=[...new Map([...(value.company?[value.company]:[]),...companies].map(company=>[company.id,company])).values()];
 const missing=roles.filter(role=>role!=='other'&&!value.stakeholders.some(item=>item.roles.includes(role)));
 function update(contactId:string,patch:Partial<OpportunityContext['stakeholders'][number]>){onChange({...value,stakeholders:value.stakeholders.map(item=>item.contactId===contactId?{...item,...patch}:item)});}
 function remove(contactId:string){const next=value.stakeholders.filter(item=>item.contactId!==contactId);if(next.length&&!next.some(item=>item.isPrimary))next[0]={...next[0],isPrimary:true};onChange({...value,stakeholders:next});}
 return <>
  <div className="buying-context__company"><label>Find a deal company<input type="search" maxLength={500} value={companyQuery} onChange={event=>onCompanyQuery(event.target.value)}/></label><label>Deal company<select aria-label="Deal company" value={value.company?.id??''} onChange={event=>{const selected=companyOptions.find(company=>company.id===event.target.value);onChange({...value,company:selected?{id:selected.id,name:selected.name??''}:null});}}><option value="">No company</option>{companyOptions.map(company=><option key={company.id} value={company.id}>{company.name}</option>)}</select></label></div>
  <h3>Deal stakeholders</h3>
  {missing.length?<p className="buying-context__missing">No recorded {missing.map(role=>roleLabels[role].toLowerCase()).join(', ')}.</p>:null}
  {!value.stakeholders.length?<p>No contacts associated. Add a contact to choose a primary outreach recipient.</p>:null}
  <ul className="buying-context__stakeholders">{value.stakeholders.map(person=><li key={person.contactId}>
   <div className="buying-context__person"><div><a href={`/app/records?kind=contact&record=${person.contactId}`}>{person.name??person.email}</a>{person.name&&person.email?<small>{person.email}</small>:null}<small>{person.contactability==='do_not_contact'?'Do not contact':person.contactability==='contactable'?'Contactable':'Contact permission unavailable'}</small></div><Verification verified={person.verified} verifiedAt={person.verifiedAt}/></div>
   {!person.roles.length?<p className="buying-context__missing">No role recorded.</p>:null}
   <fieldset className="buying-context__roles"><legend>Roles for {person.name??person.email}</legend>{roles.map(role=><label key={role}><input type="checkbox" checked={person.roles.includes(role)} onChange={event=>update(person.contactId,{roles:event.target.checked?[...person.roles,role]:person.roles.filter(item=>item!==role)})}/>{roleLabels[role]}</label>)}</fieldset>
   <div className="buying-context__relationship-actions"><label><input type="radio" name="primary-stakeholder" checked={person.isPrimary} onChange={()=>onChange({...value,stakeholders:value.stakeholders.map(item=>({...item,isPrimary:item.contactId===person.contactId}))})}/>Primary outreach recipient</label><label><input type="checkbox" checked={person.verified} onChange={event=>update(person.contactId,{verified:event.target.checked,verifiedAt:null,verifiedBy:null})}/>I confirm this stakeholder relationship</label><button type="button" onClick={()=>remove(person.contactId)}>Remove stakeholder</button></div>
  </li>)}</ul>
  <div className="buying-context__commercial"><label>Products <small>One product per line</small><textarea rows={3} maxLength={50100} value={productsText} onChange={event=>onProductsText(event.target.value)}/></label><label>Next step<textarea rows={3} maxLength={10000} value={value.nextStep} onChange={event=>onChange({...value,nextStep:event.target.value})}/></label><label>Mutual commitments<textarea rows={4} maxLength={20000} value={value.mutualCommitments} onChange={event=>onChange({...value,mutualCommitments:event.target.value})}/></label></div>
 </>;
}
function ContactCompanies({value,onChange}:{value:ContactContext;onChange:(value:ContactContext)=>void}){
 return <><p>Primary company: {value.primaryCompany?<a href={`/app/records?kind=company&record=${value.primaryCompany.id}`}>{value.primaryCompany.name}</a>:'None'}. Change the primary company with Edit details.</p><h3>Secondary companies</h3>
  {!value.secondaryCompanies.length?<p>No secondary company relationships recorded.</p>:<ul className="buying-context__stakeholders">{value.secondaryCompanies.map(company=><li key={company.companyId}>
   <div className="buying-context__person"><a href={`/app/records?kind=company&record=${company.companyId}`}>{company.name}</a><Verification verified={company.verified} verifiedAt={company.verifiedAt}/></div>
   <div className="buying-context__relationship-actions"><label><input type="checkbox" checked={company.verified} onChange={event=>onChange({...value,secondaryCompanies:value.secondaryCompanies.map(item=>item.companyId===company.companyId?{...item,verified:event.target.checked,verifiedAt:null,verifiedBy:null}:item)})}/>I confirm this company relationship</label><button type="button" onClick={()=>onChange({...value,secondaryCompanies:value.secondaryCompanies.filter(item=>item.companyId!==company.companyId)})}>Remove company</button></div>
  </li>)}</ul>}
 </>;
}
