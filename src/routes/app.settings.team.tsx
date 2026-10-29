import {editorLeaf} from '../editor/leaf';
import {createFileRoute} from '@tanstack/react-router';
import {TeamArea} from '../core/features/operator/ui/settings/team';
export const Route=createFileRoute('/app/settings/team')({component:editorLeaf(TeamArea)});
