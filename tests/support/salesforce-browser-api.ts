import {launchFixture} from './launch-fixture';
import {createDependencies} from './dependencies';
import {createApp} from './app';
import {createSourceSecurity} from '../../src/core/platform/source-security';
import {salesforceNetwork} from './salesforce-network';
/** Forward browser HTTP to the real native app over a fresh persisted store.
 * Only Salesforce's outgoing HTTP is replaced; no route response is invented. */
export async function salesforceBrowserApi(){
 const f=await launchFixture(),network=salesforceNetwork(),security=createSourceSecurity({ORBIT_ENCRYPTION_KEY:'4a'.repeat(32)})!;
 await f.db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(f.actor).run();
 const session=await createDependencies(f.db).auth.createSession(f.actor);
 const request=(path:string,method:string,body?:string)=>createApp({database:f.db,assets:{fetch:async()=>new Response(null,{status:404})},sourceSecurity:security,captureOrigin:'https://orbit.test',captureFetch:network.fetcher}).request('https://orbit.test'+path,{method,headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},...body?{body}:{}});
 return{request,network,actor:f.actor,restart:()=>f.restart(),dispose:()=>f.dispose()};
}
