import type {ActorContext,DependencyRef,SqlStatement} from '../../shared/expansion-contracts';
import {AccessError} from '../access/errors';
import {isFullOperator,fullOperatorFence} from '../access/identity-class';
import {graphReadPolicy} from '../access/query-policy';
import type {AnalyticsMetrics} from './metrics';

export interface ReportOwner {type:'contact'|'company';id:string;ownerId:string|null;revision:number}
export const ownerKey=(ref:{type:string;id:string})=>`${ref.type}:${ref.id}`;

/** Ownership is a native sidecar. Read it only for already-authorized records and a readable owner field. */
export async function reportOwners(metrics:AnalyticsMetrics,c:ActorContext,refs:DependencyRef[]){
 if(c.principal.kind!=='operator'||!await isFullOperator(metrics.store.db,c.principal.operatorId))throw new AccessError('permission','Record owner reports require full operator access.');
 const policy=await graphReadPolicy(metrics.store.access,c),field=policy.field("'owner_id'"),items:ReportOwner[]=[];
 const selected=[...new Map(refs.filter(ref=>ref.type==='contact'||ref.type==='company').map(ref=>[ownerKey(ref),ref])).values()];
 for(let offset=0;offset<selected.length;offset+=250){const chunk=selected.slice(offset,offset+250);
  const rows=(await metrics.store.db.prepare(`SELECT r.kind AS type,r.id,x.owner_id AS ownerId,COALESCE(x.revision,0) AS revision FROM graph_records r LEFT JOIN record_ownership x ON x.record_type=r.kind AND x.record_id=r.id WHERE r.tenant_id=? AND r.workspace_id=? AND r.retired_into_id IS NULL AND (r.kind||':'||r.id) IN(SELECT value FROM json_each(?)) AND ${policy.row.sql} AND ${field.sql}`).bind(c.tenantId,c.workspaceId,JSON.stringify(chunk.map(ownerKey)),...policy.row.bindings,...field.bindings).all<ReportOwner>()).results;
  if(rows.length!==chunk.length)throw new AccessError('permission','One or more record owner fields are unavailable to you.');items.push(...rows);
 }
 return {items,owners:new Map(items.map(item=>[ownerKey(item),item.ownerId])),proofs:[...fullOperatorFence(c),...ownerSourceProofs(metrics,items)]};
}

/** Missing sidecar rows mean explicitly unassigned, revision zero. Any ownership edit invalidates the measured lineage. */
export function ownerSourceProofs(metrics:AnalyticsMetrics,items:ReportOwner[]):SqlStatement[]{
 const proofs:SqlStatement[]=[];
 for(let offset=0;offset<items.length;offset+=250)proofs.push(...metrics.store.guard(`NOT EXISTS(SELECT 1 FROM json_each(?) expected LEFT JOIN record_ownership x ON x.record_type=json_extract(expected.value,'$.type') AND x.record_id=json_extract(expected.value,'$.id') WHERE x.owner_id IS NOT json_extract(expected.value,'$.ownerId') OR COALESCE(x.revision,0)<>json_extract(expected.value,'$.revision'))`,[JSON.stringify(items.slice(offset,offset+250))]));
 return proofs;
}
