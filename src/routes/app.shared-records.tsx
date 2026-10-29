import { editorLeaf } from "../editor/leaf";
import {createFileRoute} from '@tanstack/react-router';
import {FoldWorkspace} from '../core/features/fold-ui/workspace';
import {SharedRecords} from '../core/features/access/shared-records';
export const Route=createFileRoute('/app/shared-records')({component:editorLeaf(SharedRecordsRoute)});
function SharedRecordsRoute(){return <FoldWorkspace title="Shared records">{workspace=><SharedRecords workspaceId={workspace}/>}</FoldWorkspace>;}
