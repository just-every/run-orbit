import type {SalesProfile} from './policy';
export function salesOperationAllowed(profile:SalesProfile,operation:string){
 if(['graph.read','graph.search','legacy.read','analytics.read','forecast.read'].includes(operation))return true;
 if(operation==='graph.update'||operation==='legacy.write')return profile.role!=='read-only';
 if(operation==='analytics.define'||operation==='analytics.snapshot')return ['sales-admin','manager'].includes(profile.role)||profile.permissions.includes(operation);
 if(operation==='access.manage'||operation==='forecast.configure')return profile.role==='sales-admin';
 return profile.permissions.includes(operation);
}
