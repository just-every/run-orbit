import {createFileRoute} from '@tanstack/react-router';
import {editorLeaf} from '../editor/leaf';
import {FoldWorkspace} from '../core/features/fold-ui/workspace';
import {ReportsIndexPage} from '../core/features/reports/index-page';
export const Route=createFileRoute('/app/reports/')({component:editorLeaf(ReportsRoute)});

function ReportsRoute(){return <FoldWorkspace title="Reports">{workspace=><ReportsIndexPage workspace={workspace}/>}</FoldWorkspace>;}
