import {useCallback} from 'react';
import {recordsRequest} from '../records-api';
import {useOperatorResource} from '../use-operator-resource';

/** The workspace's settings read (owner, operators, pipelines, the workspace itself), made by the areas that show it. */
export function useWorkspaceSettings(){
 const load=useCallback(()=>recordsRequest<any>('settings'),[]);
 const resource=useOperatorResource('workspace-settings',load);
 return {...resource,changed:async()=>resource.reload()};
}
