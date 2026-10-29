import {editorLeaf} from '../editor/leaf';
import {createFileRoute} from '@tanstack/react-router';
export const Route=createFileRoute('/app/tasks/')({component:editorLeaf(()=>null)});
