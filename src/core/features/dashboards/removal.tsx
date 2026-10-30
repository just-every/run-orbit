import {useState} from 'react';
import {api} from '../fold-ui/workspace';
import {SaveFailure,plainFailure} from './save-failure';
/** Edit tiles › Remove dashboard: one confirm in the dialog, then the dashboard is deleted and Reports opens. */
export function DashboardRemoval({base,name}:{base:string;name:string}){
 const [asking,setAsking]=useState(false),[busy,setBusy]=useState(false),[failed,setFailed]=useState('');
 const remove=async()=>{setBusy(true);setFailed('');try{await api(base,{confirmed:true},'DELETE');window.location.assign('/app/reports');}catch(e){setFailed(plainFailure(e));setBusy(false);}};
 return <div className="dash-removal">{asking
  ?<><p>Remove “{name}”? Its tiles, sharing, schedule and everyone's default are deleted. The saved reports and forecast views behind its tiles stay.</p>{failed&&<SaveFailure message={failed} onRetry={()=>void remove()}/>}<div className="dash-removal__actions"><button type="button" disabled={busy} onClick={()=>void remove()}>Confirm remove</button><button type="button" disabled={busy} onClick={()=>{setAsking(false);setFailed('');}}>Keep dashboard</button></div></>
  :<button type="button" onClick={()=>setAsking(true)}>Remove dashboard</button>}</div>;
}
