import {editorLeaf} from '../editor/leaf';
import {createFileRoute} from '@tanstack/react-router';
import {ReviewPage} from '../core/features/operator/ui/review-page';
export const Route=createFileRoute('/app/review')({head:()=>({meta:[{title:'Review'}]}),component:editorLeaf(ReviewPage)});
