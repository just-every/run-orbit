import {createFileRoute} from '@tanstack/react-router';
import {editorLeaf} from '../editor/leaf';
import {FoldWorkspace} from '../core/features/fold-ui/workspace';
import {ForecastPage,type ForecastSearch} from '../core/features/reports/forecast-page';
const day=(value:unknown)=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)?value:undefined;
/** The forecast's address: a static segment, so it wins over a report id. The period is left out when it is the workspace month. */
const forecastSearch=(search:Record<string,unknown>):ForecastSearch=>({from:day(search.from),through:day(search.through)});
export const Route=createFileRoute('/app/reports/forecast')({validateSearch:forecastSearch,component:editorLeaf(ForecastRoute)});

function ForecastRoute(){const search=Route.useSearch();return <FoldWorkspace title="Reports">{workspace=><ForecastPage workspace={workspace} search={search}/>}</FoldWorkspace>;}
