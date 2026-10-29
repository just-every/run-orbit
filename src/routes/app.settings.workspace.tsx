import {editorLeaf} from '../editor/leaf';
import {createFileRoute} from '@tanstack/react-router';
import {WorkspaceArea} from '../core/features/operator/ui/settings/workspace';
export const Route=createFileRoute('/app/settings/workspace')({component:editorLeaf(WorkspaceArea)});
