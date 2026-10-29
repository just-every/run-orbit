import { createAgentDoor, type Trust } from '../../../base/modules/agent-door/index.ts';
import { createBusinessSettings } from '../../../base/modules/business-settings/index.ts';
import type { PlatformBindings } from '../../platform/assets';
import {flushNativeChanges} from './events';
import { orbitPeople, orbitTeam } from './people';
import {localCredentials,currentScopes} from './credentials';
import { coreTools } from './tools';
import { accessTools } from './access-tools';
import { outreachTools } from './outreach-tools';
import { salesTools } from './sales-tools';
import { providerTools } from './provider-tools';
import { resources } from './resources';
export const notTools=[{clauses:['DATA-001'],reason:'import-door' as const},{clauses:['OPS-001'],reason:'installation' as const},{clauses:['OPS-001'],reason:'screen' as const}];
function trust(b:PlatformBindings):Trust|null{
 const issuer=b.RER_OWNER_CLAIM_ISSUER,installationId=b.RER_OWNER_CLAIM_INSTALLATION_ID,appOrigin=b.RER_OWNER_CLAIM_APP_ORIGIN??b.AUTH_ORIGIN,keys=b.RER_OWNER_CLAIM_PUBLIC_KEYS;
 if(![issuer,installationId,b.RER_OWNER_CLAIM_APP_ORIGIN,keys].some(Boolean))return null;
 if(!issuer||!installationId||!appOrigin||!keys||appOrigin!==b.AUTH_ORIGIN)throw new Error('Incomplete agent trust');
 return{issuer,installationId,appOrigin,publicKeys:JSON.parse(keys)};
}
export const orbitTools=(b:PlatformBindings)=>[...coreTools(),...accessTools(),...outreachTools(b),...salesTools(),...providerTools(b)];
export function orbitAgentDoor(b:PlatformBindings){return createAgentDoor({seed:'orbit',name:'Orbit',specialist:'sales rep',origin:b.AUTH_ORIGIN??'',db:b.DB,trust:trust(b),people:orbitPeople(b),localCredentials:localCredentials(b.DB),currentScopes:currentScopes(b.DB),tools:orbitTools(b),resources:resources(),notTools,
 prompts:[{name:'seller-day',title:'Prepare a seller’s day',description:'Read cited CRM evidence, prepare a source-bound internal handoff and save a follow-up draft. Company policy decides customer dispatch, with exact saved content and current consent.',clauses:['BRIEF-001','BRIEF-005','OUT-001'],messages:()=>[{role:'user',content:{type:'text',text:'Read the current brief and selected CRM evidence. Keep observations, forecasts and buyer outcomes distinct. Create an internal handoff bound to its current source/audience revisions; save a follow-up draft without claiming it was sent.'}}]}]
 });}
export async function agentDoorResponse(request:Request,b:PlatformBindings){
 const path=new URL(request.url).pathname;
 if(!['/mcp','/agents','/api/rer/agent-policy','/api/rer/business-settings','/rer-business-logo','/rer-business.css'].includes(path)&&!path.startsWith('/agents/')&&!path.startsWith('/.well-known/oauth-protected-resource'))return null;
 try{
  if(['/api/rer/business-settings','/rer-business-logo','/rer-business.css'].includes(path)){
   const response=await createBusinessSettings({db:b.DB,trust:b.RER_BUSINESS_TRUST,business:{settings:1,values:['display_name'],team:{roles:{admin:'admin',member:'member'}}},team:orbitTeam(b.DB)}).handle(request);
   if(response&&!response.ok&&response.headers.get('content-type')?.includes('json')){const json=await response.json() as {error?:string};return Response.json({code:json.error??'settings_unavailable'},{status:response.status,headers:{'cache-control':'no-store'}});}
   return response;
  }
  const response=await orbitAgentDoor(b).handle(request);
  await flushNativeChanges(b);
  return response;
 }catch{return Response.json({code:'agent_door_unavailable'},{status:503,headers:{'cache-control':'no-store'}});}
}
