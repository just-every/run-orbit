import {useEffect,useRef,useState} from 'react';
import {useNavigate} from '@tanstack/react-router';
import {api} from '../fold-ui/workspace';
import {formatDate} from '../operator/ui/formatters';
import {DealForecastEditor} from '../forecast/deal-editor';
import {QuotaForm,StageReviewForm,type ForecastWrite} from '../forecast/review-forms';
import {ForecastResults} from '../forecast/results';
import {ForecastHistory} from '../forecast/history';
import type {ForecastPeriod,ForecastPreview,ForecastSnapshot,ForecastSnapshotMetadata,ForecastState} from '../forecast/types';
import {useCatalog} from './catalog';
import {ReadFailure,ReportsTitle} from './title';
import {PeriodControl,datesLabel,forecastPeriod} from './period';
import {BookingsGroup,ForecastBand,ForecastBasis,QuotaGroup} from './forecast-figures';
import {OptionsDrawer,OptionsSection,failure} from './advanced';
import {ForecastUnavailable,NotFound} from './not-found';
import '../analytics/console.css';

/** FORECAST-001 at its own address, for a full operator in a USD workspace only: it computes the workspace month at once, Apply
 * recomputes, and the installation owner saves it and reviews its inputs in "Inputs and history". */
export interface ForecastSearch{from?:string;through?:string}
function currentMonth(timezone:string):ForecastPeriod{const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:timezone,year:'numeric',month:'2-digit'}).formatToParts(new Date()).filter(part=>part.type!=='literal').map(part=>[part.type,Number(part.value)])),year=parts.year!,month=parts.month!-1;return {from:new Date(Date.UTC(year,month,1)).toISOString().slice(0,10),through:new Date(Date.UTC(year,month+1,1)).toISOString().slice(0,10)};}

export function ForecastPage({workspace,search}:{workspace:string;search:ForecastSearch}){
 const catalog=useCatalog(workspace);
 if(catalog.state==='loading')return <div className="reports-page"><p className="reports-status" role="status">Loading reports…</p></div>;
 if(catalog.state==='error')return <div className="reports-page"><ReadFailure error={catalog.error} retry={catalog.retry}/></div>;
 if(!catalog.full)return <NotFound/>;
 if(!catalog.forecast)return <ForecastUnavailable currency={catalog.suite.currency}/>;
 return <Forecast workspace={workspace} timezone={catalog.suite.timezone} search={search}/>;
}

/** The preserved snapshots, read when the drawer opens, then today's history of reviewed inputs. */
function Snapshots({base,state}:{base:string;state:ForecastState}){
 const [snapshots,setSnapshots]=useState<ForecastSnapshotMetadata[]|null>(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;api<{snapshots:ForecastSnapshotMetadata[]}>(`${base}/snapshots`).then(rows=>{if(active)setSnapshots(rows.snapshots);}).catch(cause=>{if(active)setError(failure(cause));});return()=>{active=false;};},[base]);
 return error?<p className="reports-refusal" role="alert">{error}</p>:snapshots?<ForecastHistory base={base} state={state} snapshots={snapshots}/>:<p role="status">Loading saved forecasts…</p>;
}

function Forecast({workspace,timezone,search}:{workspace:string;timezone:string;search:ForecastSearch}){
 const base=`/api/v2/workspaces/${encodeURIComponent(workspace)}/forecast`,navigate=useNavigate(),defaults=currentMonth(timezone);
 const from=search.from??defaults.from,through=search.through??defaults.through;
 const [state,setState]=useState<ForecastState|null>(null),[preview,setPreview]=useState<ForecastPreview|null>(null),[saved,setSaved]=useState<ForecastSnapshot|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[rerun,setRerun]=useState(0);
 const [saving,setSaving]=useState(false),[refused,setRefused]=useState(''),[drawer,setDrawer]=useState(false),[writing,setWriting]=useState(false),[inputError,setInputError]=useState(''),[status,setStatus]=useState(''),inputsButton=useRef<HTMLButtonElement>(null);
 useEffect(()=>{let active=true;api<ForecastState>(base).then(next=>{if(active)setState(next);}).catch(cause=>{if(active)setError(failure(cause));});return()=>{active=false;};},[base,attempt]);
 // One preview per open, Apply or saved input; the figures keep their nodes while it recomputes.
 useEffect(()=>{let active=true;setBusy(true);setError('');setRefused('');api<ForecastPreview>(`${base}/preview`,{from,through}).then(next=>{if(active){setPreview(next);setSaved(null);setBusy(false);}}).catch(cause=>{if(active){setPreview(null);setError(failure(cause));setBusy(false);}});return()=>{active=false;};},[base,from,through,attempt,rerun]);
 const apply=(first:string,last:string)=>{if(first===from&&last===through){setRerun(value=>value+1);return;}const custom=first!==defaults.from||last!==defaults.through;void navigate({to:'/app/reports/forecast',search:custom?{from:first,through:last}:{},replace:true,resetScroll:false});};
 const write:ForecastWrite=async(path,body,message)=>{setWriting(true);setInputError('');setStatus('');try{await api(base+path,body);setState(await api<ForecastState>(base));setRerun(value=>value+1);setStatus(message);return true;}catch(cause){setInputError(failure(cause));return false;}finally{setWriting(false);}};
 async function save(){if(!preview)return;setSaving(true);setRefused('');try{setSaved(await api<ForecastSnapshot>(`${base}/snapshots`,{from:preview.result.from,through:preview.result.through,reviewHash:preview.reviewHash}));}catch(cause){setRefused(failure(cause));}finally{setSaving(false);}}
 const result=saved?.result??preview?.result,owner=state?.canManage===true;
 return <section className="reports-page" aria-label="Sales forecast">
  <ReportsTitle title="Sales forecast" line={saved?<>Saved by {state?.operators.find(operator=>operator.id===saved.actorId)?.name??saved.actorId} · {formatDate(saved.asOf)}</>:null}
   period={<PeriodControl kind={forecastPeriod} text={datesLabel(from,through)} from={from} through={through} onApply={apply}/>}
   actions={<>{owner&&preview&&!saved&&<div className="reports-save"><button type="button" className="reports-pill" disabled={saving} onClick={()=>void save()}>Save forecast</button>{refused&&<p className="reports-refusal" role="alert">{refused}</p>}</div>}<button ref={inputsButton} type="button" className="reports-outline" onClick={()=>setDrawer(true)}>Inputs and history</button></>}/>
  {error?<ReadFailure error={error} retry={()=>setAttempt(value=>value+1)}/>:result?<div className="reports-forecast" aria-busy={busy}>
   <ForecastBand result={result}/>
   <ForecastResults result={result} part="warnings"/>
   <div className="reports-groups"><QuotaGroup result={result}/><BookingsGroup result={result}/></div>
   <details className="reports-fold reports-detail"><summary>Deals and reps</summary><ForecastResults result={result} part="detail"/></details>
   <ForecastBasis result={result} busy={busy} saved={Boolean(saved)}/>
  </div>:<p className="reports-status" role="status">Computing the forecast…</p>}
  {drawer&&<OptionsDrawer title="Inputs and history" returnFocus={inputsButton.current} onClose={()=>setDrawer(false)}>{!state?<p role="status">Loading forecast inputs…</p>:<>
   <OptionsSection title="Inputs">{owner?<>
    {inputError&&<p className="reports-refusal" role="alert">{inputError}</p>}{status&&<p className="reports-quiet" role="status">{status}</p>}
    <StageReviewForm state={state} busy={writing} write={write}/><DealForecastEditor state={state} busy={writing} write={write}/><QuotaForm state={state} busy={writing} write={write}/>
   </>:<p>Only the installation owner changes forecast inputs and saves forecasts.</p>}</OptionsSection>
   <OptionsSection title="History"><Snapshots base={base} state={state}/></OptionsSection>
  </>}</OptionsDrawer>}
 </section>;
}
