import type { ActorContext, DomainEventStatementBuilder, ResourceRef, SqlStatement } from '../../shared/expansion-contracts';
import { AccessService } from './service';
import { AccessError } from './errors';
export class ScopedMutations {
  constructor(readonly db:D1Database,readonly access:AccessService,readonly events:DomainEventStatementBuilder) {}
  event(context:ActorContext, operation:string, resource:ResourceRef, revision:number, details:unknown):SqlStatement[] {
    const eventId=crypto.randomUUID(),now=new Date().toISOString(), payload=JSON.stringify(details);
    return [...this.events.buildDomainEventStatements({schemaVersion:1,eventId,tenantId:context.tenantId,workspaceId:context.workspaceId,aggregateType:resource.type,aggregateId:resource.id,aggregateVersion:revision,kind:operation,occurredAt:now,receivedAt:now,actor:context.principal,correlationId:context.requestId,payloadRef:payload,accessEpoch:context.policyEpoch},{id:crypto.randomUUID(),scope:context,actor:context.principal,operation,resource,occurredAt:now,detailsRef:payload,correlationId:context.requestId})];
  }
  async read<T>(context:ActorContext,sql:string,bindings:readonly unknown[]=[]):Promise<D1Result<T>> {
    const checks=this.access.fence(context,'read').map(s=>this.db.prepare(s.sql).bind(...s.bindings));
    try{return (await this.db.batch([...checks,this.db.prepare(sql).bind(...bindings)])).at(-1)! as D1Result<T>;}
    catch(error){if(/CHECK constraint failed/.test(String(error)))throw new AccessError('permission','Authority changed before the read.');throw error;}
  }
  async commit(context:ActorContext, statements:readonly SqlStatement[]) {
    try { return await this.db.batch([...this.access.fence(context),...statements].map(s=>this.db.prepare(s.sql).bind(...s.bindings))); }
    catch(error) { if(/CHECK constraint failed|UNIQUE constraint failed/.test(String(error)))throw new AccessError('conflict','Concurrent state or authority changed; refresh and review.'); throw error; }
  }
}
export function revisionGuard(table:'graph_records'|'graph_relationships',id:string,workspace:string,revision:number,kind?:string):SqlStatement[] {
  const guard=crypto.randomUUID();
  return [{sql:`INSERT INTO access_write_guards VALUES(?,CASE WHEN EXISTS(SELECT 1 FROM ${table} WHERE id=? AND workspace_id=? AND revision=?${kind?' AND kind=?':''}) THEN 1 ELSE 0 END)`,bindings:[guard,id,workspace,revision,...(kind?[kind]:[])]},{sql:'DELETE FROM access_write_guards WHERE id=?',bindings:[guard]}];
}
export async function sha256(value:string) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join(''); }
