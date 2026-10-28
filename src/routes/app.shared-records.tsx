import {ManagedRecords} from '../core/features/managed-records/records';
import { editorLeaf } from "../editor/leaf";
import {AccessNavigation} from '../core/features/operator/ui/access-navigation';
import {createFileRoute} from '@tanstack/react-router';
import {FoldWorkspace} from '../core/features/fold-ui/workspace';
import {SharedRecords} from '../core/features/access/shared-records';
export const Route=createFileRoute('/app/shared-records')({component:editorLeaf(SharedRecordsRoute)});
function SharedRecordsRoute(){return <FoldWorkspace title="Shared records">{workspace=><><AccessNavigation/><SharedRecords workspaceId={workspace}/><details className="operator-surface"><summary>Leads and custom records</summary><ManagedRecords/></details></>}</FoldWorkspace>;}
