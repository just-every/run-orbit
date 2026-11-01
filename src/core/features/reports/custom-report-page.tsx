import {useEffect,useRef,useState} from 'react';
import {Link,useNavigate} from '@tanstack/react-router';
import type {MetricSnapshot} from '../../shared/expansion-contracts';
import {api} from '../fold-ui/workspace';
import {DataValue} from '../operator/ui/data-value';
import {formatDate,formatDateTime,formatTime,label} from '../operator/ui/formatters';
import {ReportDetails,reportValue} from '../analytics/report-details';
import {ReportSharing} from '../analytics/report-sharing';
import {ReportDefinitionEditor,type CustomDefinition} from '../analytics/definition-editor';
import {definitionBody,recordOnce,type ReadyCatalog} from './catalog';
import type {ReportSearch} from './report-page';
import {ReadFailure,ReportsTitle} from './title';
import {PeriodControl,customPeriod,windowLabel} from './period';
import {CustomSavedResults,OptionsDrawer,OptionsSection,Versions,failure} from './advanced';
import '../analytics/console.css';

/** A custom record report open: Open opportunities reads the current population; any other computes over the 30 days up to
 * the moment it opens, or the window in its address. Its result, details and saved history moved here from the old console. */
type Result=MetricSnapshot&{reviewHash?:string;population?:{pages:number;records:number;startedAt:string;completedAt:string}};
const DAY=86400000,instant=(value:string|undefined)=>value&&!/^\d{4}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))?value:undefined;
const local=(iso:string)=>{const date=new Date(iso),pad=(value:number)=>String(value).padStart(2,'0');return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;};
function detailValueLabel(key:string){const labels:Record<string,string>={n:'Source records',denominator:'Base',unit:'Unit'};return labels[key]??key.replace(/([a-z0-9])([A-Z])/g,'$1 $2').replaceAll('_',' ').replace(/^./,letter=>letter.toUpperCase());}
function plainIncompleteReason(reason:string){
 if(reason.includes('No open opportunities were returned'))return 'No open opportunities are available to you in this workspace.';
 if(reason.includes('CRM paging completed'))return 'The CRM does not confirm that all recent changes have arrived.';
 if(reason.includes('Source watermark has not reached'))return 'The source has not confirmed that updates are complete through this period.';
 if(reason.includes('lack a denominator'))return 'Some source records are missing a value needed to calculate this result.';
 return reason;
}

function CustomResult({report,name,builtIn,busy}:{report:Result;name:string;builtIn:boolean;busy:boolean}){
 const [sourcePage,setSourcePage]=useState(0),text=reportValue(report),value=report.values.value;
 const figure=typeof value==='number'&&!report.measurement?.currency?String(value):text,unit=figure===text?'':text.slice(figure.length+1);
 const extra=Object.entries(report.values).filter(([key])=>!['value','formattedValue','unit','groups'].includes(key));
 return <article className="analytics-console__result reports-custom" aria-busy={busy}>
  <dl className="reports-figure"><div className="reports-key"><dt>{name}</dt><dd>{figure}{unit&&<span className="reports-figure__unit">{unit}</span>}</dd></div></dl>
  <p className="reports-quiet">{builtIn?`Read ${formatDateTime(report.through)}`:`${formatDateTime(report.from)} to ${formatDateTime(report.through)}`}</p>
  {report.incompleteReasons.length>0&&<ul>{report.incompleteReasons.map(reason=><li key={reason}>{plainIncompleteReason(reason)}</li>)}</ul>}
  <details className="reports-fold"><summary>How this report is calculated</summary>
   <ReportDetails report={report}/>
   {report.population&&<p>Records read: {report.population.records}. Pages read: {report.population.pages}.</p>}
   <p>{report.inputs.length} source records.{report.fxSnapshots.length>0&&<> {report.fxSnapshots.length} exchange rates were used.</>}</p>
   {extra.length>0&&<dl>{extra.map(([key,item])=><div key={key}><dt>{detailValueLabel(key)}</dt><dd>{item===null?'Not available':<DataValue value={item}/>}</dd></div>)}</dl>}
   <p>{report.watermark==='native-transaction-fenced'?'Native records were checked against the current data and access revisions.':report.watermark==='unknown'?'The source has not confirmed that all updates are complete through this period.':`Source updates are confirmed through ${formatDate(report.watermark)}.`}</p>
   <p>{report.inputs.length} source records. Opening a record checks current access.</p><details><summary>Audit details: source records</summary><ol>{report.inputs.slice(sourcePage*50,sourcePage*50+50).map(ref=><li key={`${ref.type}:${ref.id}`}><a href={`/app/shared-records?${new URLSearchParams({kind:ref.type,id:ref.id})}`}>Open {label(ref.type)}</a></li>)}</ol><button type="button" disabled={sourcePage===0} onClick={()=>setSourcePage(page=>page-1)}>Previous source records</button><button type="button" disabled={(sourcePage+1)*50>=report.inputs.length} onClick={()=>setSourcePage(page=>page+1)}>Next source records</button></details>
  </details>
 </article>;
}

export function CustomReportPage({workspace,catalog,id,search,builtIn}:{workspace:string;catalog:ReadyCatalog;id:string;search:ReportSearch;builtIn:boolean}){
 const base=`/api/v2/workspaces/${encodeURIComponent(workspace)}/operations`,navigate=useNavigate(),template=`${base}/metrics/templates/open-opportunities`;
 const group=catalog.reports.find(report=>report.id===id),name=builtIn?'Open opportunities':group?.name??id;
 const [opened]=useState(()=>Date.now()),defaults={from:new Date(opened-30*DAY).toISOString(),through:new Date(opened).toISOString()};
 const from=instant(search.from)??defaults.from,through=instant(search.through)??defaults.through,custom=Boolean(instant(search.from)&&instant(search.through));
 const [version,setVersion]=useState<number|null>(null),[report,setReport]=useState<Result|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState(''),[saving,setSaving]=useState(false),[refused,setRefused]=useState(''),[options,setOptions]=useState(false),[attempt,setAttempt]=useState(0),[rerun,setRerun]=useState(0);
 const shown=useRef<Result|null>(null),previewed=useRef({from,through}),optionsButton=useRef<HTMLButtonElement>(null);shown.current=report;
 const address=(next:ReportSearch):ReportSearch=>({...next.version?{version:next.version}:{},...next.result?{result:next.result}:{},...!builtIn&&next.from&&next.through?{from:next.from,through:next.through}:{}});
 const go=(next:ReportSearch)=>void navigate({to:'/app/reports/$id',params:{id},search:address(next),replace:true,resetScroll:false});
 // A version or a reopened result chosen in Report options shows on the page, so the drawer closes.
 useEffect(()=>setOptions(false),[search.version,search.result]);
 // Open opportunities is recorded first for a viewer who can define (as "Set up" did); a viewer it is shared with only previews.
 useEffect(()=>{
  if(search.result)return;
  if(search.version){setVersion(search.version);return;}
  if(!builtIn||!catalog.suite.canDefine){setVersion(group?.versions[0]?.version??null);return;}
  let active=true;setBusy(true);setError('');
  recordOnce<{id:string;version:number;created:boolean}>(template).then(async ready=>{if(ready.created)await catalog.reload();if(active)setVersion(ready.version);}).catch(cause=>{if(active){setError(failure(cause));setBusy(false);}});
  return()=>{active=false;};
 },[search.result,search.version,attempt]);
 useEffect(()=>{
  const result=search.result;if(!result&&version===null)return;
  if(result&&shown.current&&!shown.current.reviewHash&&shown.current.id===result){setBusy(false);return;}
  let active=true;setBusy(true);setError('');setRefused('');previewed.current={from,through};
  (result?api<Result>(`${base}/snapshots/${encodeURIComponent(result)}`):builtIn?api<Result>(`${template}/preview`,{version}):api<Result>(`${base}/metrics/${encodeURIComponent(id)}/preview`,{version,from,through}))
   .then(next=>{if(active){setReport(next);setBusy(false);}}).catch(cause=>{if(active){setReport(null);setError(failure(cause));setBusy(false);}});
  return()=>{active=false;};
 },[search.result,version,from,through,attempt,rerun]);
 // Apply recomputes once: a new window through the address, the same window in place.
 const apply=(first:string,last:string)=>{const start=new Date(first).toISOString(),end=new Date(last).toISOString();if(!search.result&&start===from&&end===through){setRerun(value=>value+1);return;}go({version:search.version,from:start,through:end});};
 async function save(){
  if(!report?.reviewHash||version===null)return;setSaving(true);setRefused('');
  try{const saved=await(builtIn?api<Result>(`${template}/save`,{version,reviewHash:report.reviewHash}):api<Result>(`${base}/metrics/${encodeURIComponent(id)}/snapshots`,{version,...previewed.current,reviewHash:report.reviewHash}));setReport(saved);shown.current=saved;go({...search,result:saved.id});}
  catch(cause){setRefused(failure(cause));}finally{setSaving(false);}
 }
 const live=!search.result&&report?.reviewHash,open=search.result?report?.definitionVersion??null:version,stored=group?.versions.find(item=>item.version===open);
 const newest=Math.max(group?.versions[0]?.version??0,open??0);
 const line=search.result&&report?<>Saved result · measured {formatDate(report.asOf)} · <Link to="/app/reports/$id" params={{id}} activeOptions={{exact:true}} search={address({...search,result:undefined})} replace resetScroll={false}>Show the live report</Link></>
  :open!==null&&open<newest?<>Version {open} of {newest} · <Link to="/app/reports/$id" params={{id}} activeOptions={{exact:true}} search={address({...search,result:undefined,version:newest})} replace resetScroll={false}>Open version {newest}</Link></>:null;
 const shownFrom=search.result&&report?report.from:from,shownThrough=search.result&&report?report.through:through;
 return <div className="reports-page">
  <ReportsTitle title={name} line={line}
   period={builtIn?undefined:<PeriodControl kind={customPeriod} text={custom||search.result?windowLabel(shownFrom,shownThrough,catalog.suite.timezone):'Last 30 days'} from={local(shownFrom)} through={local(shownThrough)} onApply={apply}/>}
   actions={<>{live&&<div className="reports-save"><button type="button" className="reports-pill" disabled={saving} onClick={()=>void save()}>Save result</button>{refused&&<p className="reports-refusal" role="alert">{refused}</p>}</div>}<button ref={optionsButton} type="button" className="reports-outline" onClick={()=>setOptions(true)}>Report options</button></>}/>
  {error?<ReadFailure error={error} retry={()=>setAttempt(value=>value+1)}>{search.result&&<> <Link to="/app/reports/$id" params={{id}} activeOptions={{exact:true}} search={address({...search,result:undefined})} replace>Show the live report</Link></>}</ReadFailure>
   :report?<><CustomResult report={report} name={name} builtIn={builtIn} busy={busy}/><p className="reports-basis-line">{busy?'Computing…':['Basis',...live?[`Computed ${formatTime(report.asOf)}`,'Not saved']:['Saved result']].join(' · ')}</p></>
   :<p className="reports-status" role="status">Computing {name}…</p>}
  {options&&<OptionsDrawer title="Report options" returnFocus={optionsButton.current} onClose={()=>setOptions(false)}>
   {open!==null&&<CustomSavedResults base={base} id={id} version={open} onReopen={result=>{setOptions(false);go({version:search.version,result});}}/>}
   <OptionsSection title="Sharing"><ReportSharing base={base} id={id}/></OptionsSection>
   <Versions id={id} versions={group?.versions??[]} open={open}/>
   {!builtIn&&catalog.suite.canDefine&&stored&&<OptionsSection title="Edit"><ReportDefinitionEditor workspaceId={workspace} mode={{kind:'edit',id,newest,definition:definitionBody(stored) as CustomDefinition}} onSaved={(saved,next)=>void catalog.reload().then(()=>go({version:next,from:search.from,through:search.through}))}/></OptionsSection>}
  </OptionsDrawer>}
 </div>;
}
