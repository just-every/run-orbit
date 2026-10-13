import { editorLeaf } from "../editor/leaf";
import {createFileRoute} from '@tanstack/react-router';
import {FormsConsole} from '../core/features/forms/console';
import {FoldWorkspace} from '../core/features/fold-ui/workspace';
export const Route=createFileRoute('/app/forms')({component: editorLeaf(FormsRoute)});

function FormsRoute() { return <FoldWorkspace title="Forms and landing pages">{workspace=><FormsConsole workspaceId={workspace}/>}</FoldWorkspace>; }
