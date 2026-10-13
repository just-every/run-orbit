import {useState} from 'react';
import {workbenchRequest} from './workbench-api';
import {OperatorState} from './operator-shell';
export function ManualAction({recommendationId,reload}:{recommendationId:string;reload:()=>void}){
 const [note,setNote]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function finish(outcome:'completed'|'skipped'){setBusy(true);setError('');try{await workbenchRequest(`/recommendations/${recommendationId}/complete`,{outcome,note});reload();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <div className="operator-manual-action"><label>Action outcome note (optional)<textarea value={note} onChange={e=>setNote(e.target.value)}/></label><div className="operator-actions"><button className="operator-button" disabled={busy} onClick={()=>void finish('completed')}>Mark action complete</button><button disabled={busy} onClick={()=>void finish('skipped')}>Skip action</button></div>{error&&<OperatorState kind="error">{error}</OperatorState>}</div>;
}
export function RecommendationRefresh({opportunityId,reload}:{opportunityId:string;reload:()=>void}){const [error,setError]=useState(''),[busy,setBusy]=useState(false);async function refresh(){setBusy(true);try{await workbenchRequest(`/opportunities/${opportunityId}/recommendation`,{});reload();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}return <div className="operator-refresh"><button disabled={busy} onClick={()=>void refresh()}>Re-evaluate recommendation</button>{error&&<OperatorState kind="error">{error}</OperatorState>}</div>;}
