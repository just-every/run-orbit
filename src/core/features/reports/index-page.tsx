import {useLayoutEffect,useRef,useState} from 'react';
import {useElementScrollRestoration} from '@tanstack/react-router';
import {useHashMap} from '../operator/ui/hash-target';
import {DashboardDirectory,useDashboardDirectory} from '../dashboards/directory';
import {builtInIds,useCatalog,OPEN_OPPORTUNITIES,type ReadyCatalog} from './catalog';
import {ReadFailure,ReportsTitle} from './title';
import {Row} from './rows';
import {CreateDashboardDialog,CreateMenu,NewCustomReport,type CreateChoice} from './create-menu';

/** Reports at rest: one list of what opens, the dashboards first (the viewer's default first), then the reports, with one
 * create control for viewers who can define. Nothing else is laid open. */
function ReportList({catalog}:{catalog:ReadyCatalog}){
 const {suite,reports,forecast}=catalog,builtIns=builtInIds(suite),saved=suite.canDefine?reports.filter(report=>!builtIns.has(report.id)):reports;
 const empty=!forecast&&!saved.length&&!suite.canDefine;
 return <section className="reports-section" aria-labelledby="reports-list-heading"><h2 id="reports-list-heading">Reports</h2>
  {empty?<p className="reports-empty">No reports are shared with you yet.</p>:<ul className="reports-list">
   {forecast&&<Row target={{to:'/app/reports/forecast'}} name="Sales forecast" line="Weighted pipeline, bookings and quota attainment."/>}
   {saved.map(report=><Row key={report.id} target={{to:'/app/reports/$id',params:{id:report.id}}} name={report.name} line={report.description||undefined}/>)}
   {suite.canDefine&&suite.templates.map(template=><Row key={template.id} target={{to:'/app/reports/$id',params:{id:template.id}}} name={template.definition.name} line={template.definition.description}/>)}
   {suite.canDefine&&<Row target={{to:'/app/reports/$id',params:{id:OPEN_OPPORTUNITIES}}} name="Open opportunities" line="Count of the open opportunities you may read."/>}
  </ul>}
 </section>;
}
/** An old `#forecast` link: the forecast where this viewer and install have one, otherwise Reports itself, with no message. */
function ForecastHash({eligible}:{eligible:boolean}){useHashMap(hash=>hash==='forecast'?eligible?'/app/reports/forecast':'/app/reports':null);return null;}

export function ReportsIndexPage({workspace}:{workspace:string}){
 const catalog=useCatalog(workspace),directory=useDashboardDirectory(workspace),[dialog,setDialog]=useState<CreateChoice|null>(null);
 const ready=catalog.state==='ready'&&Boolean(directory.data||directory.error);
 // Back to this list: the router restores its scroll before the reads answer, so the rows' first render takes it back.
 const scroll=useElementScrollRestoration({getElement:()=>window}),restored=useRef(false);
 useLayoutEffect(()=>{if(!ready||restored.current)return;restored.current=true;if(scroll)window.scrollTo({top:scroll.scrollY,left:scroll.scrollX});},[ready]);
 return <div className="reports-page reports-index">
  <ReportsTitle title="Reports" back={false} actions={catalog.state==='ready'&&catalog.suite.canDefine?<CreateMenu onChoose={setDialog}/>:null}/>
  {catalog.state==='error'?<ReadFailure error={catalog.error} retry={catalog.retry}/>:catalog.state==='ready'&&ready?<>
   <DashboardDirectory directory={directory} onCreate={()=>setDialog('dashboard')}/>
   <ReportList catalog={catalog}/>
   <ForecastHash eligible={catalog.forecast}/>
  </>:<p className="reports-status" role="status">Loading reports…</p>}
  {dialog==='dashboard'&&<CreateDashboardDialog workspace={workspace} onClose={()=>setDialog(null)}/>}
  {dialog==='custom'&&<NewCustomReport workspace={workspace} onClose={()=>setDialog(null)}/>}
 </div>;
}
