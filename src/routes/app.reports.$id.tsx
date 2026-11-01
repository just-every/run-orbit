import {createFileRoute} from '@tanstack/react-router';
import {editorLeaf} from '../editor/leaf';
import {FoldWorkspace} from '../core/features/fold-ui/workspace';
import {ReportPage,type ReportSearch} from '../core/features/reports/report-page';
const month=/^\d{4}-\d{2}$/,instant=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;
const bound=(value:unknown)=>typeof value==='string'&&(month.test(value)||instant.test(value))?value:undefined;
/** A report's own address: the open version, a reopened saved result and the period, each left out when it is the default. */
function reportSearch(search:Record<string,unknown>):ReportSearch{
 const version=Number(search.version),result=typeof search.result==='string'&&/^[a-zA-Z0-9_-]{1,200}$/.test(search.result)?search.result:undefined;
 return {version:Number.isInteger(version)&&version>0?version:undefined,result,from:bound(search.from),through:bound(search.through)};
}
export const Route=createFileRoute('/app/reports/$id')({validateSearch:reportSearch,component:editorLeaf(ReportRoute)});

function ReportRoute(){const {id}=Route.useParams(),search=Route.useSearch();return <FoldWorkspace title="Reports">{workspace=><ReportPage key={id} workspace={workspace} id={id} search={search}/>}</FoldWorkspace>;}
