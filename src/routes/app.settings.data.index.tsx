import {editorLeaf} from '../editor/leaf';
import {createFileRoute} from '@tanstack/react-router';
import {DataArea} from '../core/features/operator/ui/settings/data';
export const Route=createFileRoute('/app/settings/data/')({component:editorLeaf(DataArea)});
