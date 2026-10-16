import {editorLeaf} from '../editor/leaf';
import {createFileRoute} from '@tanstack/react-router';
import {CaptureConnectPage} from '../core/features/operator/ui/capture-connect-page';
export const Route=createFileRoute('/app/capture/connect/$method')({component:editorLeaf(CaptureConnectPage)});
