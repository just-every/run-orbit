import type {Principal} from '../../../base/modules/agent-door/index.ts';
import {bearer,currentGrant,grantBindings,grantMatchPredicate} from '../delegation/authority';
import {scoped} from '../delegation/protocol';

const clientPrefix='orbit-delegation:';
export async function localGrant(db:D1Database,ctx:Pick<Principal,'person'|'clientId'>,target:string,scope:string) {
  if(!ctx.clientId?.startsWith(clientPrefix))return null;
  const grant=await currentGrant(db,ctx.clientId.slice(clientPrefix.length));
  if(grant.principal_id!==ctx.person.id)throw new Error('Native credential sponsor changed');
  scoped(grant,target,scope);return grant;
}
const scopes=(native:string[])=>[
  ...(native.includes('crm.evidence.read')?['records:read','handoffs:read']:[]),
  ...(native.includes('crm.handoff.write')?['handoffs:write']:[]),
];
export async function localCredentials(db:D1Database,request:Request) {
  if(!/^Bearer [a-f0-9]{64}$/.test(request.headers.get('authorization')??''))return null;
  try {const grant=await bearer(db,request);return {sponsor:{id:grant.principal_id},agent:{id:grant.client_id,name:grant.client_id},clientId:clientPrefix+grant.id,scopes:scopes(JSON.parse(grant.scopes_json))};}
  catch {return null;}
}
export async function currentScopes(db:D1Database,ctx:Principal) {
  if(!ctx.clientId?.startsWith(clientPrefix))return [...ctx.scopes];
  try {const grant=await currentGrant(db,ctx.clientId.slice(clientPrefix.length));return grant.principal_id===ctx.person.id?scopes(JSON.parse(grant.scopes_json)):[];}
  catch {return [];}
}
