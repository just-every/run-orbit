import {editorLeaf} from '../editor/leaf';
import {createFileRoute} from '@tanstack/react-router';
import {IntegrationsArea} from '../core/features/operator/ui/settings/integrations';
export const Route=createFileRoute('/app/settings/integrations')({component:editorLeaf(IntegrationsArea)});
