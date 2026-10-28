import {devAdmitted} from '@runeditrun/rer/modules/operator-auth/dev-admission';
import {deny,hash,type Grant} from './protocol';

// Native delegation exposes complete source records. A collaborator profile or
// record grant can never confer this separate, unrestricted authority class.
export const nativeFullPredicate="o.status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators x WHERE x.operator_id=o.id) AND (o.setup_owner=1 OR NOT EXISTS(SELECT 1 FROM sales_roles role WHERE role.operator_id=o.id))";
export const nativeActorPredicate=`EXISTS(SELECT 1 FROM operators o WHERE o.id=? AND ${nativeFullPredicate})`;
const grantJoins='delegation_grants g JOIN operators o ON o.id=g.principal_id JOIN delegation_clients c ON c.id=g.client_id JOIN workspace_settings w ON w.id=g.account_id';
const grantCurrent=`g.revoked_at IS NULL AND g.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now') AND c.enabled=1 AND ${nativeFullPredicate}`;
const authorityFields=['principal_id','client_id','account_id','scopes_json','targets_json','expires_at','token_hash'] as const;
export const grantMatchPredicate=authorityFields.map(field=>`g.${field} IS ?`).join(' AND ');
export const grantBindings=(grant:Grant)=>authorityFields.map(field=>grant[field]);

export async function currentGrant(db:D1Database,id:string,expected?:Grant){
 const g=await db.prepare(`SELECT g.* FROM ${grantJoins} WHERE g.id=? AND ${grantCurrent} AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import')`).bind(id).first<Grant>();
 if(!g||expected&&authorityFields.some(field=>g[field]!==expected[field]))deny(401,'DELEGATION_INVALID');
 return g!;
}
export async function bearer(db:D1Database,request:Request){
 const header=request.headers.get('Authorization')??undefined;
 if(!header?.match(/^Bearer [a-f0-9]{64}$/))deny(401,'DELEGATION_INVALID');
 const tokenHash=await hash(header!.slice(7));
 const row=await db.prepare('SELECT g.id,EXISTS(SELECT 1 FROM identity_dev_grants d WHERE d.grant_id=g.id) AS dev_minted FROM delegation_grants g WHERE g.token_hash=?').bind(tokenHash).first<{id:string;dev_minted:number}>();
 if(!row)deny(401,'DELEGATION_INVALID');
 // A credential minted from a local dev session counts only behind the checkout's dev key.
 if(row!.dev_minted===1&&!await devAdmitted(request))deny(401,'DELEGATION_INVALID');
 const g=await currentGrant(db,row!.id);
 if(g.token_hash!==tokenHash)deny(401,'DELEGATION_INVALID');
 return g;
}
export function guard(db:D1Database,id:string,epoch:number,grant?:Grant,actor?:string){
 return db.prepare(`INSERT INTO delegation_guards(id,valid) SELECT ?,CASE WHEN (SELECT epoch FROM delegation_installation)=? AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND ${nativeActorPredicate} ${grant?`AND EXISTS(SELECT 1 FROM ${grantJoins} WHERE g.id=? AND ${grantCurrent} AND ${grantMatchPredicate})`:''} THEN 1 ELSE 0 END`).bind(id,epoch,grant?.principal_id??actor,...(grant?[grant.id,...grantBindings(grant)]:[]));
}

export async function revoke(db:D1Database,g:Grant){
 const result=await db.prepare(`UPDATE delegation_grants AS g SET revoked_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE g.id=? AND ${grantMatchPredicate} AND EXISTS(SELECT 1 FROM operators o WHERE o.id=g.principal_id AND ${nativeFullPredicate}) AND g.revoked_at IS NULL AND g.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now') AND EXISTS(SELECT 1 FROM delegation_clients WHERE id=g.client_id AND enabled=1) AND EXISTS(SELECT 1 FROM workspace_settings WHERE id=g.account_id) AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import')`).bind(g.id,...grantBindings(g)).run();
 if(!result.meta.changes)deny(401,'DELEGATION_INVALID');
}
