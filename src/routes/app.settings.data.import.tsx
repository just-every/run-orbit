import {editorLeaf} from '../editor/leaf';
import {createFileRoute} from '@tanstack/react-router';
import {ImportsPage} from '../core/features/operator/ui/imports-page';
export const Route=createFileRoute('/app/settings/data/import')({component:editorLeaf(ImportsPage)});
