import {salesProfile} from './policy';
import {AccessService} from '../access/service';
import {legacyDatabase} from '../access/legacy-database';
import {buildPreview} from '../assistance/preview';
import {deny} from '../access/errors';
import type {AuthenticatedOperator} from '../identity';
/** The exact preview bytes must also be producible from the current permitted projection. */
export async function assertSalesAiPreview(db:D1Database,operator:AuthenticatedOperator,opportunityId:string,contactId:string|undefined,feature:'draft'|'explanation',preview:unknown){
 if(!await salesProfile(db,operator.operatorId))return;
 const access=new AccessService(db),scope=await access.originalWorkspace(),actor=await access.resolveOperatorContext(operator,scope.workspaceId,crypto.randomUUID());
 try{const permitted=await buildPreview(legacyDatabase(db,actor),opportunityId,contactId,feature);if(JSON.stringify(permitted)!==JSON.stringify(preview))deny('AI input contains records or fields outside your current access.');}catch{deny('AI input contains records or fields outside your current access.');}
}
