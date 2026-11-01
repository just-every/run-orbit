import {useId,useState} from 'react';
import {useNavigate} from '@tanstack/react-router';
import {MenuButton} from '../operator/ui/record/menu-button';
import {DashboardIcon} from '../dashboards/icons';
import {DashboardModal} from '../dashboards/modal';
import {createDashboard} from '../dashboards/directory';
import {ReportDefinitionEditor} from '../analytics/definition-editor';

/** The index's one create control: New, holding Create a dashboard and New custom report. */
export type CreateChoice='dashboard'|'custom';
export function CreateMenu({onChoose}:{onChoose:(choice:CreateChoice)=>void}){
 return <MenuButton className="reports-pill reports-new" label={<>New<DashboardIcon kind="chevron"/></>} choices={[{label:'Create a dashboard',onChoose:()=>onChoose('dashboard')},{label:'New custom report',onChoose:()=>onChoose('custom')}]}/>;
}

export function CreateDashboardDialog({workspace,onClose}:{workspace:string;onClose:()=>void}){
 const [name,setName]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),id=useId();
 return <DashboardModal title="Create a dashboard" onClose={onClose}><form className="reports-drawer reports-create" onSubmit={async event=>{event.preventDefault();setBusy(true);setError('');try{await createDashboard(workspace,name);}catch(e){setError(e instanceof Error?e.message:String(e));setBusy(false);}}}>
  <label>Dashboard name<input value={name} maxLength={120} required aria-describedby={error?id:undefined} onChange={event=>setName(event.target.value)}/></label>
  {error&&<p id={id} role="alert" className="reports-refusal">{error}</p>}
  <div className="operator-dialog__actions"><button className="reports-pill" disabled={busy}>Create a dashboard</button></div>
 </form></DashboardModal>;
}

export function NewCustomReport({workspace,onClose}:{workspace:string;onClose:()=>void}){
 const navigate=useNavigate();
 return <DashboardModal title="New custom report" drawer onClose={onClose}><div className="reports-drawer">
  <ReportDefinitionEditor workspaceId={workspace} mode={{kind:'create'}} onSaved={id=>void navigate({to:'/app/reports/$id',params:{id}})}/>
 </div></DashboardModal>;
}
