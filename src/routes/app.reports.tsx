import { editorLeaf } from "../editor/leaf";
import {createFileRoute} from '@tanstack/react-router';
import {ForecastConsole} from '../core/features/forecast/console';
import {AnalyticsConsole} from '../core/features/analytics/console';
import {FoldWorkspace} from '../core/features/fold-ui/workspace';
import {ReportDefinitionEditor} from '../core/features/analytics/definition-editor';
import {DashboardDirectory} from '../core/features/dashboards/directory';
import {SalesReports} from '../core/features/analytics/sales-console';
import {ScrollToHash} from '../core/features/operator/ui/hash-target';
export const Route=createFileRoute('/app/reports')({component: editorLeaf(ReportsRoute)});

function ReportsRoute() { return <FoldWorkspace title="Reports">{workspace=><><DashboardDirectory workspace={workspace}/><SalesReports workspaceId={workspace}/><ForecastConsole workspaceId={workspace}/><ReportDefinitionEditor workspaceId={workspace}/><AnalyticsConsole workspaceId={workspace}/><ScrollToHash ready/></>}</FoldWorkspace>; }
