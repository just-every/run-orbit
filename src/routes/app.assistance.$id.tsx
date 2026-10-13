import { editorLeaf } from "../editor/leaf";
import {createFileRoute} from '@tanstack/react-router';
import {AssistancePage} from '../core/features/operator/ui/assistance-page';
export const Route=createFileRoute('/app/assistance/$id')({component: editorLeaf(Page)});
function Page(){return <AssistancePage opportunityId={Route.useParams().id}/>;}
