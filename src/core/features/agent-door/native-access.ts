import {AccessService} from '../access/service';
import {deny} from '../access/errors';
import {fullOperatorFence} from '../access/identity-class';
import type {ActorContext, SqlStatement} from '../../shared/expansion-contracts';
import type {ResourceContext, ToolContext} from '../../../base/modules/agent-door/index.ts';
import {orbitPeople,nativePersonAdmission} from './people';
import {currentGrant,grantMatchPredicate,grantBindings} from '../delegation/authority';
import type {Grant} from '../delegation/protocol';
import type {PlatformBindings} from '../../platform/assets';

/** An explicit native agent admission, without issuing or borrowing a session.
 * The empty session field is never passed to native session admission. Only
 * contexts created by this instance can use its non-session authority fence. */
export class AgentAccess extends AccessService {
  private readonly contexts = new WeakSet<ActorContext>();
  private readonly grantsAtAdmission = new WeakMap<ActorContext,Grant>();
  constructor(private readonly bindings: PlatformBindings, private readonly who: ResourceContext | ToolContext) {super(bindings.DB);}
  async context(): Promise<ActorContext> {
    const person = await orbitPeople(this.bindings).person(this.who.person.id);
    if (!person?.active) deny('The sponsoring person is unavailable.');
    const scope = await this.originalWorkspace();
    const row = await this.db.prepare("SELECT w.policy_epoch FROM access_workspaces w JOIN access_memberships m ON m.workspace_id=w.id WHERE w.id=? AND m.operator_id=? AND m.status='active'").bind(scope.workspaceId,person.id).first<{policy_epoch:number}>();
    if (!row) deny();
    const c: ActorContext = {...scope,requestId:crypto.randomUUID(),policyEpoch:row.policy_epoch,agentApprovers:'approvers' in this.who?this.who.approvers:[],principal:{kind:'operator',operatorId:person.id,sessionId:'',agent:{id:this.who.agent.id,name:this.who.agent.name,label:`${this.who.agent.name} for ${person.name}`,sponsorName:person.name}}};
    this.contexts.add(c);
    if(person.role!=='member')this.addDependencyFences(c,fullOperatorFence(c),'native-class');
    if(this.who.clientId?.startsWith('orbit-delegation:')) {
      const grant=await currentGrant(this.db,this.who.clientId.slice('orbit-delegation:'.length));
      if(grant.principal_id!==person.id)deny('Native credential sponsor changed.');
      this.grantsAtAdmission.set(c,grant);
    }
    return c;
  }
  override async refreshContext(c: ActorContext) {
    if (!this.contexts.has(c)) deny('Native agent context required.');
    const current = await this.context();
    if (current.tenantId !== c.tenantId || current.workspaceId !== c.workspaceId) deny();
    return current;
  }
  override fence(c: ActorContext, _mode:'read'|'write'='write'): SqlStatement[] {
    if (!this.contexts.has(c) || c.principal.kind !== 'operator') deny();
    const id=crypto.randomUUID(), person=c.principal.operatorId;
    const grant=this.grantsAtAdmission.get(c),nativeGrants=this.admittedGrantIds(c),now=new Date().toISOString();
    return [{sql:`INSERT INTO access_write_guards VALUES(?,CASE WHEN EXISTS(
      SELECT 1 FROM access_workspaces w JOIN access_memberships m ON m.workspace_id=w.id JOIN operators o ON o.id=m.operator_id
      WHERE w.id=? AND w.tenant_id=? AND w.policy_epoch=? AND o.id=? AND o.status='active' AND m.status='active'
      AND ${nativePersonAdmission})
      AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import'))
      ${grant?`AND EXISTS(SELECT 1 FROM delegation_grants g JOIN delegation_clients client ON client.id=g.client_id WHERE g.id=? AND client.enabled=1 AND g.revoked_at IS NULL AND g.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now') AND ${grantMatchPredicate})`:''}
      AND (SELECT count(*) FROM access_grants WHERE id IN(SELECT value FROM json_each(?)) AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>max(?,strftime('%Y-%m-%dT%H:%M:%fZ','now'))))=?
      THEN 1 ELSE 0 END)`,bindings:[id,c.workspaceId,c.tenantId,c.policyEpoch,person,...(grant?[grant.id,...grantBindings(grant)]:[]),JSON.stringify(nativeGrants),now,nativeGrants.length]}, {sql:'DELETE FROM access_write_guards WHERE id=?',bindings:[id]},...this.dependencyFences(c)];
  }
}

/** Existing native repositories commit under current authority in the same
 * transaction as their own revision/consent guards. Attribution is inserted by
 * schema triggers in that transaction and never supplied by a caller. */
export function agentDatabase(db: D1Database, access: AgentAccess, actor: ActorContext, ctx: ToolContext): D1Database {
  const underlying = new WeakMap<object,D1PreparedStatement>();
  const wrap = (statement:D1PreparedStatement):D1PreparedStatement => {
    const proxy = new Proxy(statement, {get(target,key) {
      if (key === 'bind') return (...args:unknown[]) => wrap(target.bind(...args));
      if (key === 'run') return async () => (await batch([target]))[0];
      const value=Reflect.get(target,key);return typeof value === 'function' ? value.bind(target) : value;
    }});
    underlying.set(proxy,statement);return proxy;
  };
  async function batch<T = unknown>(statements:D1PreparedStatement[]):Promise<D1Result<T>[]> {
    await access.refreshContext(actor);
    const fences=access.fence(actor).map(s=>db.prepare(s.sql).bind(...s.bindings));
    const before=[...fences,db.prepare('INSERT INTO orbit_agent_write_context(singleton,actor_json) VALUES(1,?)').bind(JSON.stringify({preparedBy:ctx.actor,approvers:ctx.approvers}))];
    const results=await db.batch<T>([...before,...statements.map(s=>underlying.get(s)??s),db.prepare('DELETE FROM orbit_agent_write_context WHERE singleton=1')]);
    return results.slice(before.length,-1);
  }
  return new Proxy(db,{get(target,key) {
    if (key === 'prepare') return (sql:string)=>wrap(target.prepare(sql));
    if (key === 'batch') return batch;
    const value=Reflect.get(target,key);return typeof value === 'function' ? value.bind(target) : value;
  }});
}
