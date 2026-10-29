import {useState,type FormEvent} from 'react';
import {Link,useNavigate} from '@tanstack/react-router';
import {OperatorShell,OperatorState} from './operator-shell';
import {RecordSearchField} from './record-search-field';
import {recordPath} from './records-query';
import type {CustomerRecord} from './records-api';
import './records.css';

type Existing={id:string;name:string;field:'email'|'primary_domain'};
const words={contact:{title:'New contact',create:'Create contact',identity:'email'},company:{title:'New company',create:'Create company',identity:'website'}} as const;

/** Creating a contact or a company is one committed action: a few fields and one Create; the record then opens at its
 * own address in place of this page, with the caret in its first empty field. */
export function RecordCreatePage({kind}:{kind:'contact'|'company'}){
 const navigate=useNavigate(),[values,setValues]=useState({name:'',email:'',primary_domain:''}),[company,setCompany]=useState<CustomerRecord|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[existing,setExisting]=useState<Existing|null>(null);
 async function create(event:FormEvent){
  event.preventDefault();setBusy(true);setError('');setExisting(null);
  const input=kind==='contact'?{name:values.name.trim()||null,email:values.email.trim()||null,company_id:company?.id??null}:{name:values.name.trim(),primary_domain:values.primary_domain.trim()||null};
  try{
   const response=await fetch(`/api/v1/records/${kind}`,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
   const result=await response.json().catch(()=>({})) as {id?:string;error?:string;recordId?:string};
   if(response.status===409&&result.recordId){
    const other=await fetch(`/api/v1/records/${kind}/${result.recordId}`,{credentials:'same-origin'}).then(answer=>answer.ok?answer.json() as Promise<{record:CustomerRecord}>:null).catch(()=>null);
    setExisting({id:result.recordId,name:other?.record.name??other?.record.email??'Another record',field:kind==='contact'?'email':'primary_domain'});return;
   }
   if(!response.ok||!result.id)throw new Error(result.error??'Orbit could not create this record.');
   await navigate({to:recordPath[kind],params:{id:result.id},replace:true,state:{created:true} as any});
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 const taken=(field:Existing['field'])=>existing?.field===field?<p className="record-create__taken" role="alert">{existing.name} already uses this {words[kind].identity}. <Link to={recordPath[kind]} params={{id:existing.id}}>Open {existing.name}</Link></p>:null;
 const field=(name:'name'|'email'|'primary_domain',label:string,type='text',autoFocus=false)=><label>{label}<input type={type} autoFocus={autoFocus} maxLength={500} required={kind==='company'&&name==='name'} value={values[name]} onChange={e=>{setValues({...values,[name]:e.target.value});if(existing?.field===name)setExisting(null);}}/></label>;
 return <OperatorShell title={words[kind].title}>
  <form className="operator-surface workbench-form record-create" onSubmit={create}>
   {field('name','Name','text',true)}
   {kind==='contact'?<>{field('email','Email','email')}{taken('email')}
    <div className="record-create__company"><span className="record-create__label">Company</span>{company?<p className="record-link-picker__chip"><span>{company.name}</span><button type="button" className="operator-text-button" onClick={()=>setCompany(null)}>Change</button></p>:<RecordSearchField kind="company" label="Company" placeholder="Search companies" onChoose={setCompany}/>}</div>
   </>:<>{field('primary_domain','Website')}{taken('primary_domain')}</>}
   {error?<OperatorState kind="error">{error}</OperatorState>:null}
   <button className="operator-button" disabled={busy}>{busy?'Creating…':words[kind].create}</button>
  </form>
 </OperatorShell>;
}
export const NewContactPage=()=><RecordCreatePage kind="contact"/>;
export const NewCompanyPage=()=><RecordCreatePage kind="company"/>;
