import {editorLeaf} from '../editor/leaf';
import {createFileRoute} from '@tanstack/react-router';
import {CapturePage} from '../core/features/operator/ui/capture-page';
export const Route=createFileRoute('/app/capture/')({component:editorLeaf(CapturePage)});
