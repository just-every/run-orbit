import {createFileRoute} from '@tanstack/react-router';
import {editorLeaf} from '../editor/leaf';
import {SequenceEditorPage} from '../core/features/sequences/ui/editor-page';
export const Route=createFileRoute('/app/sequences/$id')({component:editorLeaf(SequenceRoute)});
function SequenceRoute(){const{id}=Route.useParams();return <SequenceEditorPage id={id}/>;}
