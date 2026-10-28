import { editorLeaf } from "../editor/leaf";
import {createFileRoute} from '@tanstack/react-router';
import {AssistancePage} from '../core/features/operator/ui/assistance-page';
import {useCallback} from 'react';
import {operatorApi} from '../core/features/operator/ui/operator-api';
import {OperatorShell,OperatorState} from '../core/features/operator/ui/operator-shell';
import {useOperatorResource} from '../core/features/operator/ui/use-operator-resource';
import {operatorDetailErrors,OperatorDetailState,requireDetailId} from './-operator-detail';
export const Route=createFileRoute('/app/assistance/$id')({
 beforeLoad:({params})=>requireDetailId(params.id,'assistance'),
 ...operatorDetailErrors('assistance'),
 component:editorLeaf(Page),
});
function Page(){
 const {id}=Route.useParams();
 const resource=useOperatorResource(`assistance:${id}`,useCallback(()=>operatorApi.readOpportunity(id),[id]));
 if(resource.error)return <OperatorDetailState kind="assistance"/>;
 if(!resource.data)return <OperatorShell title="Assistance"><OperatorState>Loading opportunity…</OperatorState></OperatorShell>;
 return <AssistancePage opportunityId={id}/>;
}
