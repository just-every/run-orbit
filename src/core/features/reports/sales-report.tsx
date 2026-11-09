import {useEffect,useRef,useState} from 'react';
import {Link,useNavigate} from '@tanstack/react-router';
import {api} from '../fold-ui/workspace';
import type {SalesView} from '../analytics/sales-view';
import type {SalesDefinition} from '../analytics/sales-definition';
import {SalesReportEditor} from '../analytics/sales-editor';
import {ReportSharing} from '../analytics/report-sharing';
import {formatDate} from '../operator/ui/formatters';
import {definitionBody,recordOnce,type ReadyCatalog} from './catalog';
import type {ReportSearch} from './report-page';
import {ReadFailure,ReportsTitle} from './title';
import {PeriodControl,localMonth,monthsLabel,salesPeriod} from './period';
import {SalesResultView} from './sales-result-view';
import {OptionsDrawer,OptionsSection,SalesSavedResults,Versions,failure} from './advanced';
import '../analytics/sales.css';

const month=(value:string|undefined)=>value&&/^\d{4}-\d{2}$/.test(value)?value:undefined;
/** A sales report open: a built-in is recorded first (as Open did), then the period computes at once, last month to this month
 * in the workspace zone by default. Save keeps the reviewed result; a saved result reopens at `?result=`. */
export function SalesReportPage({workspace,catalog,id,search,builtIn}:{workspace:string;catalog:ReadyCatalog;id:string;search:ReportSearch;builtIn:boolean}){
 const base=`/api/v2/workspaces/${encodeURIComponent(workspace)}/operations`,navigate=useNavigate(),{suite}=catalog;
 const group=catalog.reports.find(report=>report.id===id),template=suite.templates.find(item=>item.id===id);
 const defaults={from:localMonth(suite.timezone,-1),through:localMonth(suite.timezone,0)},from=month(search.from)??defaults.from,through=month(search.through)??defaults.through;
 const [version,setVersion]=useState<number|null>(null),[view,setView]=useState<SalesView|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState(''),[saving,setSaving]=useState(false),[refused,setRefused]=useState(''),[options,setOptions]=useState(false),[attempt,setAttempt]=useState(0),[rerun,setRerun]=useState(0);
 const shown=useRef<SalesView|null>(null),optionsButton=useRef<HTMLButtonElement>(null);shown.current=view;
 // Defaults stay out of the address; a period, a version and a reopened result replace it, so Back returns to the index.
 const address=(next:ReportSearch):ReportSearch=>({...next.version?{version:next.version}:{},...next.result?{result:next.result}:{},...next.from&&next.through&&(next.from!==defaults.from||next.through!==defaults.through)?{from:next.from,through:next.through}:{}});
 const go=(next:ReportSearch)=>void navigate({to:'/app/reports/$id',params:{id},search:address(next),replace:true,resetScroll:false});
 // Version links close the drawer; reopen and recompute close it in their own handlers below.
 // Saving publishes the result before its address settles: that later URL update must not dismiss options opened since.
 useEffect(()=>setOptions(false),[search.version]);
 // The open version: the address's, else the built-in's exact saved version, else the newest the viewer can see.
 useEffect(()=>{
  if(search.result)return;
  if(search.version){setVersion(search.version);return;}
  if(!builtIn){setVersion(group?.versions[0]?.version??null);return;}
  let active=true;setBusy(true);setError('');
  recordOnce<{id:string;version:number;created:boolean}>(`${base}/reports/suite/${encodeURIComponent(id)}`).then(async opened=>{if(opened.created)await catalog.reload();if(active)setVersion(opened.version);}).catch(cause=>{if(active){setError(failure(cause));setBusy(false);}});
  return()=>{active=false;};
 },[search.result,search.version,attempt]);
 // One request per open, period, version or reopened result; the result keeps its node while it recomputes.
 useEffect(()=>{
  const result=search.result;if(!result&&version===null)return;
  if(result&&shown.current?.saved&&shown.current.id===result){setBusy(false);return;}
  let active=true;setBusy(true);setError('');setRefused('');
  (result?api<SalesView>(`${base}/snapshots/${encodeURIComponent(result)}`):api<SalesView>(`${base}/reports/${encodeURIComponent(id)}/preview`,{version,from,through}))
   .then(next=>{if(active){setView(next);setBusy(false);}}).catch(cause=>{if(active){setView(null);setError(failure(cause));setBusy(false);}});
  return()=>{active=false;};
 },[search.result,version,from,through,attempt,rerun]);
 // Apply recomputes once: a new period through the address, the same period in place.
 const apply=(first:string,last:string)=>{if(!search.result&&first===from&&last===through){setRerun(value=>value+1);return;}go({version:search.version,from:first,through:last});};
 async function save(){
  if(!view||version===null)return;setSaving(true);setRefused('');
  try{const saved=await api<SalesView>(`${base}/reports/${encodeURIComponent(id)}/snapshots`,{version,from:view.period.fromMonth,through:view.period.throughMonth,reviewHash:view.reviewHash});setView(saved);shown.current=saved;go({...search,result:saved.id});}
  catch(cause){setRefused(failure(cause));}finally{setSaving(false);}
 }
 const name=view?.name??group?.name??template?.definition.name??id,open=view?.definitionVersion??version,newest=Math.max(group?.versions[0]?.version??0,open??0);
 const shownFrom=view?.saved?view.period.fromMonth:from,shownThrough=view?.saved?view.period.throughMonth:through,period=monthsLabel(shownFrom,shownThrough);
 const live={...search,result:undefined},stored=group?.versions.find(item=>item.version===open),definition=view?.definition??(stored?definitionBody(stored) as SalesDefinition:undefined);
 const line=view?.saved?<>Saved result · measured {formatDate(view.asOf,view.timezone)} · <Link to="/app/reports/$id" params={{id}} activeOptions={{exact:true}} search={address(live)} replace resetScroll={false}>Show the live report</Link></>
  :open!==null&&open<newest?<>Version {open} of {newest} · <Link to="/app/reports/$id" params={{id}} activeOptions={{exact:true}} search={address({...live,version:newest})} replace resetScroll={false}>Open version {newest}</Link></>:null;
 return <div className="reports-page">
  <ReportsTitle title={name} line={line}
   period={<PeriodControl kind={salesPeriod} text={period} from={shownFrom} through={shownThrough} onApply={apply}/>}
   actions={<>{view&&!view.saved&&view.reviewHash&&<div className="reports-save"><button type="button" className="reports-pill" disabled={saving} onClick={()=>void save()}>Save result</button>{refused&&<p className="reports-refusal" role="alert">{refused}</p>}</div>}<button ref={optionsButton} type="button" className="reports-outline" onClick={()=>setOptions(true)}>Report options</button></>}/>
  {error?<ReadFailure error={error} retry={()=>setAttempt(value=>value+1)}>{search.result&&<> <Link to="/app/reports/$id" params={{id}} activeOptions={{exact:true}} search={address(live)} replace>Show the live report</Link></>}</ReadFailure>
   :view?<SalesResultView view={view} busy={busy} full={catalog.full} period={period}/>:<p className="reports-status" role="status">Computing {name}…</p>}
  {options&&<OptionsDrawer title="Report options" returnFocus={optionsButton.current} onClose={()=>setOptions(false)}>
   {open!==null&&<SalesSavedResults base={base} id={id} version={open} shown={view} onReopen={result=>{setOptions(false);go({version:search.version,result});}} onRecompute={()=>{setOptions(false);if(view)go({version:view.definitionVersion,from:view.period.fromMonth,through:view.period.throughMonth});}}/>}
   <OptionsSection title="Sharing"><ReportSharing base={base} id={id}/></OptionsSection>
   <Versions id={id} versions={group?.versions??[]} open={open}/>
   {suite.canDefine&&definition&&<OptionsSection title="Edit"><SalesReportEditor base={base} suite={suite} report={{id,newest}} definition={definition} onSaved={(saved,next)=>{if(saved!==id){void navigate({to:'/app/reports/$id',params:{id:saved}});return;}void catalog.reload().then(()=>go({version:next,from:search.from,through:search.through}));}}/></OptionsSection>}
  </OptionsDrawer>}
 </div>;
}
