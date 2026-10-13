import { useCallback, useState, type FormEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { OperatorShell, OperatorState } from './operator-shell';
import { workbenchRequest, type Inventory } from './workbench-api';
import { useOperatorResource } from './use-operator-resource';
export function CreateOpportunityPage() {
  const navigate=useNavigate(), load=useCallback(()=>workbenchRequest<Inventory>(''),[]), resource=useOperatorResource('create',load);
  const [values,setValues]=useState({companyName:'',contactName:'',email:'',title:'',value:'0',stageId:''});
  const [error,setError]=useState<string|null>(null), [saving,setSaving]=useState(false);
  function field(name:keyof typeof values,label:string,type='text') {return <label style={{alignContent:'start'}}>{label}<input disabled={!resource.data||saving} required type={type} min={type==='number'?'0':undefined} step={type==='number'?'0.01':undefined} value={values[name]} onChange={event=>setValues({...values,[name]:event.target.value})}/></label>;}
  async function save(event:FormEvent) {event.preventDefault();setSaving(true);setError(null);try {const {id}=await workbenchRequest<{id:string}>('/opportunities',{...values,stageId:values.stageId||resource.data?.stages[0]?.id,valueCents:Math.round(Number(values.value)*100)});await navigate({to:'/app/opportunities/$id',params:{id}});}catch(error){setError((error as Error).message);}finally{setSaving(false);}}
  return <OperatorShell title="Create opportunity" action={<Link to="/app/records">← Back to opportunities</Link>}>
    {resource.error?<OperatorState kind="error">{resource.error.message}</OperatorState>:null}
    <form onSubmit={save} className="workbench-create workbench-create--entry">
      <div className="workbench-create__fields">
        <section className="operator-surface workbench-form" style={{alignContent:'start'}}><h2>Account</h2>{field('companyName','Company name')}</section>
        <section className="operator-surface workbench-form" style={{alignContent:'start'}}><h2>Contact</h2>{field('contactName','Contact name')}{field('email','Contact email','email')}</section>
        <section className="operator-surface workbench-form" style={{alignContent:'start'}}><h2>Opportunity details</h2>{field('title','Opportunity title')}{field('value','Estimated value in workspace currency','number')}</section>
        <section className="operator-surface workbench-form" style={{alignContent:'start'}}><h2>Pipeline</h2><label>Pipeline stage<select disabled={!resource.data||saving} required value={values.stageId||resource.data?.stages[0]?.id||''} onChange={event=>setValues({...values,stageId:event.target.value})}>{resource.data?.stages.map(stage=><option key={stage.id} value={stage.id}>{stage.name}</option>)}</select></label></section>
      </div>
      <div className="operator-surface workbench-actions"><Link to="/app/records">Cancel</Link>{error?<OperatorState kind="error">{error}</OperatorState>:null}<button className="operator-button" disabled={saving||!resource.data}>{saving?'Saving…':'Save opportunity'}</button></div>
    </form>
  </OperatorShell>;
}
