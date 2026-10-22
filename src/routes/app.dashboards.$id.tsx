import {createFileRoute} from '@tanstack/react-router';
import {editorLeaf} from '../editor/leaf';
import {FoldWorkspace} from '../core/features/fold-ui/workspace';
import {DashboardPage} from '../core/features/dashboards/page';
export const Route=createFileRoute('/app/dashboards/$id')({component:editorLeaf(DashboardRoute)});
function DashboardRoute(){const {id}=Route.useParams();return <FoldWorkspace title="Reports">{workspace=><DashboardPage workspace={workspace} id={id}/>}</FoldWorkspace>;}
