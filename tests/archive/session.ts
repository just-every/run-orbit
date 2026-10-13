import {requestOfflineFixture} from "../../scripts/browser-runtime.mjs";
if (await requestOfflineFixture("tests/archive/session.ts", process.argv.slice(2))) process.exit(0);
import {getPlatformProxy} from 'wrangler';
import {createDependencies} from '../support/dependencies';
import { sessionCookieName } from '../support/test-auth';
const state=process.env.ORBIT_TEST_STATE;
if(!state||!process.env.ORBIT_ARCHIVE_TEST)throw new Error('Archive fixture requires its isolated test state.');
const platform=await getPlatformProxy<{DB:D1Database}>({configPath:'wrangler.jsonc',envFiles:['tests/support/no-local-settings.env'],persist:{path:`${state}/v3`},remoteBindings:false});
try{
 const db=platform.env.DB,ownerId='01J00000000000000000000990';
 if(!await db.prepare('SELECT id FROM operators LIMIT 1').first()){await db.prepare("INSERT INTO owner_bootstrap(id,owner_id,email,display_name,workspace_name,timezone,currency,stages_json,created_at) VALUES('initial-owner',?,'archive-owner@example.test','Archive owner','Archive proof','UTC','USD',?,'2026-09-13T00:00:00.000Z')").bind(ownerId,JSON.stringify([{id:'01J00000000000000000000991',name:'Qualified'}])).run();await db.prepare("INSERT INTO first_run_setup VALUES('workspace','2026-09-13T00:00:00.000Z')").run();}
 const auth=createDependencies(db).auth;
 const sessionOwner=process.argv.includes('--target-owner')?'01J00000000000000000000992':ownerId;
 if(sessionOwner!==ownerId)await auth.ensureOperator({id:sessionOwner,email:'target-owner@example.test',displayName:'Target owner'});
 const session=await auth.createSession(sessionOwner);
 process.stdout.write(JSON.stringify({cookieName:sessionCookieName,token:session.token}));
}finally{await platform.dispose();}
