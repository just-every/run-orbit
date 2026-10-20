import { editorLeaf } from "../editor/leaf";
import {createFileRoute} from '@tanstack/react-router';
import {ForecastConsole} from '../core/features/forecast/console';
import {AnalyticsConsole} from '../core/features/analytics/console';
import {FoldWorkspace} from '../core/features/fold-ui/workspace';
import {ReportDefinitionEditor} from '../core/features/analytics/definition-editor';
export const Route=createFileRoute('/app/reports')({component: editorLeaf(ReportsRoute)});

function ReportsRoute() { return <FoldWorkspace title="Reports">{workspace=><><ForecastConsole workspaceId={workspace}/><ReportDefinitionEditor workspaceId={workspace}/><AnalyticsConsole workspaceId={workspace}/></>}</FoldWorkspace>; }
