import {editorLeaf} from '../editor/leaf';
import {createFileRoute} from '@tanstack/react-router';
import {BriefPage} from '../core/features/operator/ui/brief-page';
export const Route=createFileRoute('/app/brief')({head:()=>({meta:[{title:'Brief'}]}),component:editorLeaf(BriefPage)});
