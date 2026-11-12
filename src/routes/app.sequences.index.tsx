import {createFileRoute} from '@tanstack/react-router';
import {editorLeaf} from '../editor/leaf';
import {SequencesPage} from '../core/features/sequences/ui/index-page';
export const Route=createFileRoute('/app/sequences/')({component:editorLeaf(SequencesPage)});
