import {editorLeaf} from '../editor/leaf';
import {createFileRoute} from '@tanstack/react-router';
import {FormsArea} from '../core/features/operator/ui/settings/forms';
export const Route=createFileRoute('/app/settings/forms')({component:editorLeaf(FormsArea)});
