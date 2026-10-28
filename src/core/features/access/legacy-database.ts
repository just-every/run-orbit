import {isFullOperator,fullOperatorFence} from './identity-class';
import { Hono } from 'hono';
import type { ActorContext, SqlStatement } from '../../shared/expansion-contracts';
import type { AuthenticatedOperator } from '../identity';
import { AccessService } from './service';
import {legacyProjection} from './legacy-projection';
import {principalKey} from './policy';
import { AccessError, deny } from './errors';
const databaseActors=new WeakMap<D1Database,ActorContext>();
/** Server-only custody attached by the verified legacy request boundary. */
export function legacyActorContext(db:D1Database):ActorContext|undefined{return databaseActors.get(db);}
export function legacyCursorScope(db:D1Database):Record<string,string>{const actor=databaseActors.get(db);return actor?{workspaceId:actor.workspaceId,tenantId:actor.tenantId,policyEpoch:String(actor.policyEpoch),principal:principalKey(actor.principal)}:{workspaceId:'workspace',authority:'internal_original_repository'};}
/** Legacy tables hold ONLY the immutable original workspace. Scoped records in other workspaces
 * never enter them. Every query, including counts and FTS, has an atomic current-authority
 * fence and permitted projection. Expansion archives require their separately scoped operation. */
export function legacyDatabase(db:D1Database,actor:ActorContext):D1Database {
  const access=new AccessService(db),statements=new WeakMap<object,{sql:string;bindings:unknown[];owned?:boolean}>();
  const run=async(items:Array<{sql:string;bindings:unknown[];raw?:boolean;owned?:boolean}>)=>{
    const full=(actor.principal.kind==='operator'||actor.principal.kind==='agent')&&await isFullOperator(db,actor.principal.operatorId);
    if(full)access.addDependencyFences(actor,fullOperatorFence(actor),'native-class');
    if(!full)for(const item of items){if(/^\s*(SELECT|WITH)\b/i.test(item.sql))continue;const mutation=/^\s*UPDATE\s+(companies|contacts|opportunities)\s+SET\s+(name|title)\s*=\s*\?\s+WHERE\s+id\s*=\s*\?\s*;?$/i.exec(item.sql);if(!mutation||item.bindings.length!==2)deny('Use the native record edit boundary for this mutation.');const kind=({companies:'company',contacts:'contact',opportunities:'opportunity'} as Record<string,string>)[mutation[1].toLowerCase()]!;await access.authorize(actor,'graph.update',{...actor,type:kind,id:String(item.bindings[1])},[mutation[2].toLowerCase()]);}
    const projected=await Promise.all(items.map(item=>full||item.owned?{sql:item.sql,bindings:[]}:legacyProjection(db,actor,item.sql)));const prepared=projected.map((p,i)=>db.prepare(items[i].raw&&/^\s*(SELECT|WITH)\b/i.test(p.sql)?`SELECT * FROM (${p.sql})`:p.sql).bind(...p.bindings,...items[i].bindings));
    const guard=crypto.randomUUID();const checks=[...access.fence(actor).map(s=>db.prepare(s.sql).bind(...s.bindings)),db.prepare('INSERT INTO access_write_guards VALUES(?,CASE WHEN EXISTS(SELECT 1 FROM access_legacy_mapping WHERE workspace_id=? AND tenant_id=?) THEN 1 ELSE 0 END)').bind(guard,actor.workspaceId,actor.tenantId),db.prepare('DELETE FROM access_write_guards WHERE id=?').bind(guard)];

    try{return (await db.batch([...checks,...prepared])).slice(checks.length,checks.length+prepared.length);}
    catch(error){if(/CHECK constraint failed|LEGACY_.*PERMISSION/.test(String(error)))throw new AccessError('permission','Record access changed; refresh workspace context.');throw error;}
  };
  const wrap=(sql:string,bindings:unknown[]=[]):D1PreparedStatement=>{
    const item={sql,bindings};const value={bind:(...values:unknown[])=>wrap(sql,values),all:async()=>(await run([item]))[0],run:async()=>(await run([item]))[0],first:async(column?:string)=>{const row=(await run([item]))[0].results?.[0] as Record<string,unknown>|undefined;return column?(row?.[column]??null):(row??null);},raw:async(options?:{columnNames?:boolean})=>{const rows=(await run([{...item,raw:true}]))[0].results as Record<string,unknown>[];if(!rows.length)return [];return [...(options?.columnNames?[Object.keys(rows[0])]:[]),...rows.map(row=>Object.values(row))];}} as D1PreparedStatement;statements.set(value,item);return value;
  };
  const scoped={prepare:(sql:string)=>wrap(sql),batch:async(items:D1PreparedStatement[])=>run(items.map(item=>{const raw=statements.get(item);if(!raw)deny('Unscoped statement cannot enter a scoped batch.');return raw;})),exec:async()=>deny('Unscoped execution is unavailable.'),dump:async()=>deny('Use scoped export.')} as unknown as D1Database;
  databaseActors.set(scoped,actor);
  return scoped;
}
/** Root wraps every authenticated /api/v1 mount (including archive, connections, assistance and
 * drafts) with this boundary. Factory executes per request, avoiding shared mutable request state. */
export function createLegacyBoundary(db:D1Database,mountPath:string,factory:(scoped:D1Database)=>Hono<any>) {
  const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>();
  app.all('*',async c=>{
    try {

      const operator=c.get('operator');if(!operator)deny('Native operator session required.');
      const access=new AccessService(db),actor=await access.authorizeLegacy(operator,crypto.randomUUID(),['GET','HEAD'].includes(c.req.method)?'legacy.read':'legacy.write');
      const child=factory(legacyDatabase(db,actor));
      // Forward verified context through a closure, never headers or JSON supplied by the caller.
      const mounted=new Hono<{Variables:{operator:AuthenticatedOperator}}>();mounted.use('*',async(ctx,next)=>{ctx.set('operator',operator);await next();});mounted.route('/',child);
      const url=new URL(c.req.url);url.pathname=url.pathname.slice(mountPath.length)||'/';
      return await mounted.fetch(new Request(url,c.req.raw),c.env);
    } catch(error){if(error instanceof AccessError)return c.json({error:error.message},error.status);throw error;}
  });return app;
}
