import {useState} from 'react';
import {workbenchRequest} from './workbench-api';
import {OperatorState} from './operator-shell';
export function RecommendationRefresh({opportunityId,reload}:{opportunityId:string;reload:()=>void}){const [error,setError]=useState(''),[busy,setBusy]=useState(false);async function refresh(){setBusy(true);try{await workbenchRequest(`/opportunities/${opportunityId}/recommendation`,{});reload();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}return <div className="operator-refresh"><button disabled={busy} onClick={()=>void refresh()}>Re-evaluate recommendation</button>{error&&<OperatorState kind="error">{error}</OperatorState>}</div>;}
