import {editorLeaf} from '../editor/leaf';
import {createFileRoute} from '@tanstack/react-router';
import {CaptureReviewPage} from '../core/features/operator/ui/capture-review-page';
export const Route=createFileRoute('/app/capture/review')({component:editorLeaf(CaptureReviewPage)});
