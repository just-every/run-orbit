import assert from 'node:assert/strict';
import {isolatedDatabase} from '../../tests/support/isolated-database';
import {createDependencies} from '../../src/core/app/dependencies';
import {AccessService} from '../../src/core/features/access/service';
import {AccessAdministration} from '../../src/core/features/access/administration';
import {domainEventStatements} from '../../src/core/features/effects/event-statements';
import {GraphRecords} from '../../src/core/features/graph/repository';
import {RecordsRepository} from '../../src/core/features/records/repository';
import {createId} from '../../src/core/shared/ids';
import {emailLinkSignIn} from '../../tests/support/email-link';
import {testAuth} from '../../tests/support/test-auth';
import {sha256} from '../../src/core/features/identity/store';
import type {ActorContext} from '../../src/core/shared/expansion-contracts';
export async function signIn(db:D1Database,email:string){const {operator,cookie}=await emailLinkSignIn(db,email,{returnTo:'/app/access'});return{operator,cookie};}
/** The pre-Base session format, for a historical store whose own (old) code signs in. */
export async function legacySignIn(db:D1Database,email:string){const id=await db.prepare('SELECT id FROM operators WHERE lower(email)=lower(?)').bind(email).first<string>('id');assert.ok(id);const session=await testAuth(db).legacySession(id!);
 // The pre-Base engine's own check: an unrevoked, unexpired session of an active operator.
 const row=await db.prepare("SELECT o.id,o.email,o.display_name FROM sessions s JOIN operators o ON o.id=s.operator_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? AND o.status='active'").bind(await sha256(session.token),new Date().toISOString()).first<{id:string;email:string;display_name:string}>();
 const operator=row?{sessionId:session.id,operatorId:row.id,email:row.email,displayName:row.display_name,devSession:false}:undefined;return{operator,cookie:`__Host-orbit_session=${session.token}`};}
export async function fixture(){const target=await isolatedDatabase(),db=target.db,id=createId(),stage=createId(),now=new Date().toISOString();await db.prepare('INSERT INTO owner_bootstrap VALUES(?,?,?,?,?,?,?,?,?)').bind('initial-owner',id,'owner@fold.test','Owner','Native Orbit','UTC','USD',JSON.stringify([{id:stage,name:'New'}]),now).run();await db.prepare("INSERT INTO first_run_setup VALUES('workspace',?)").bind(now).run();const session=await signIn(db,'owner@fold.test'),access=new AccessService(db),admin=new AccessAdministration(db,access,domainEventStatements),graph=new GraphRecords(db,access,domainEventStatements),records=new RecordsRepository(db);
 const f={target,get db(){return target.db;},access,admin,graph,records,stage,operator:session.operator,nativeOperator:session.operator,cookie:session.cookie,scope:{tenantId:'orbit',workspaceId:'workspace'},context:():Promise<ActorContext>=>f.access.resolveOperatorContext(f.operator,'workspace',crypto.randomUUID()),nativeContext:()=>f.access.resolveOperatorContext(f.nativeOperator,'workspace',crypto.randomUUID()),close:()=>target.dispose()};return f;}
export async function collaborator(f:Awaited<ReturnType<typeof fixture>>,role:'analyst'|'seller'|'guest'='analyst'){const email=`${createId().toLowerCase()}@collaborator.test`,invite=await f.admin.invite(await f.nativeContext(),{email,role,expiresAt:new Date(Date.now()+86400000).toISOString()}),session=await signIn(f.db,email);assert.deepEqual(await f.access.listWorkspaces(session.operator),[]);await assert.rejects(f.access.resolveOperatorContext(session.operator,'workspace','pending'));await f.admin.accept(session.operator,invite.token);await assert.rejects(f.admin.accept(session.operator,invite.token));return session;}
/** Test adapter calls the genuine native repository, then reads the installed projection. */
export async function nativeRecord(f:Awaited<ReturnType<typeof fixture>>,kind:'company'|'contact'|'opportunity',fields:Record<string,unknown>){const saved=await f.records.save(kind,{...(kind==='opportunity'?{stage_id:f.stage,value_cents:0}:{}),...fields},f.nativeOperator.operatorId);return f.graph.getRecord(await f.nativeContext(),{...f.scope,type:kind,id:saved.id},[]);}
