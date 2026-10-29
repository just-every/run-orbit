import {editorLeaf} from '../editor/leaf';
import {createFileRoute} from '@tanstack/react-router';
import {CaptureArea} from '../core/features/operator/ui/settings/capture';
export const Route=createFileRoute('/app/settings/capture/')({component:editorLeaf(CaptureArea)});
