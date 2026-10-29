import {editorLeaf} from '../editor/leaf';
import {createFileRoute} from '@tanstack/react-router';
/** A task opened from the list or from a stored link; the list above it renders the task in place. */
export const Route=createFileRoute('/app/tasks/$id')({component:editorLeaf(()=>null)});
