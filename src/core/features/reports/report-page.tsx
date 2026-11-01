import {useCatalog,OPEN_OPPORTUNITIES} from './catalog';
import {ReadFailure} from './title';
import {SalesReportPage} from './sales-report';
import {CustomReportPage} from './custom-report-page';
import {NotFound} from './not-found';

/** `/app/reports/<id>`: a built-in sales report, a saved sales report, Open opportunities, a custom report, or Not found. */
export interface ReportSearch{version?:number;result?:string;from?:string;through?:string}
export function ReportPage({workspace,id,search}:{workspace:string;id:string;search:ReportSearch}){
 const catalog=useCatalog(workspace);
 if(catalog.state==='loading')return <div className="reports-page"><p className="reports-status" role="status">Loading reports…</p></div>;
 if(catalog.state==='error')return <div className="reports-page"><ReadFailure error={catalog.error} retry={catalog.retry}/></div>;
 const group=catalog.reports.find(report=>report.id===id),define=catalog.suite.canDefine;
 if(id===OPEN_OPPORTUNITIES&&(define||group))return <CustomReportPage workspace={workspace} catalog={catalog} id={id} search={search} builtIn/>;
 if(define&&catalog.suite.templates.some(template=>template.id===id))return <SalesReportPage workspace={workspace} catalog={catalog} id={id} search={search} builtIn/>;
 if(group?.kind==='sales')return <SalesReportPage workspace={workspace} catalog={catalog} id={id} search={search} builtIn={false}/>;
 if(group)return <CustomReportPage workspace={workspace} catalog={catalog} id={id} search={search} builtIn={false}/>;
 return <NotFound/>;
}
