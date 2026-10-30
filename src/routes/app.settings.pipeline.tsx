import {editorLeaf} from '../editor/leaf';
import {createFileRoute} from '@tanstack/react-router';
import {PipelineArea} from '../core/features/operator/ui/settings/pipeline';
export const Route=createFileRoute('/app/settings/pipeline')({component:editorLeaf(PipelineArea)});
