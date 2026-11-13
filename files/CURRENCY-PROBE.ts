import assert from 'node:assert/strict';
import {launchFixture} from '../tests/support/launch-fixture';
import {pipedriveNetwork} from '../tests/support/pipedrive-network';
import {createSourceSecurity} from '../src/core/platform/source-security';
import {createDependencies} from '../tests/support/dependencies';
import {createApp} from '../tests/support/app';
const f=await launchFixture();try{
 await f.db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(f.actor).run();
 const network=pipedriveNetwork(),security=createSourceSecurity({ORBIT_ENCRYPTION_KEY:'7a'.repeat(32)})!,session=await createDependencies(f.db).auth.createSession(f.actor);let now=Date.parse('2026-11-01T12:00:00Z');
 const app=createApp({database:f.db,assets:{fetch:async()=>new Response(null,{status:404})},sourceSecurity:security,pipedriveFetch:network.fetcher,pipedriveNow:()=>now});
 const api=(path:string,body:any)=>app.request('https://orbit.test/api/v1/imports/pipedrive'+path,{method:'POST',headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await api('/connection',{token:'synthetic-orbit-currency',confirmedReadOnly:true})).status,200);
 let pull=await (await api('/pulls',{})).json() as any;
 for(let n=0;n<20&&pull.state!=='ready';n++){if(pull.nextAt)now=Date.parse(pull.nextAt)+1;pull=await (await api(`/pulls/${pull.id}/advance`,{})).json();}assert.equal(pull.state,'ready');
 const currency=await f.request('settings','PUT',{name:'Currency proof',timezone:'UTC',currency:'EUR',workingHours:{days:[1,2,3,4,5],start:'09:00',end:'17:00'},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});assert.equal(currency.status,200);
 const preview=await api(`/pulls/${pull.id}/preview`,{stages:{'1:101':f.stage,'2:201':f.stage},owners:{}});console.log('USD source preview in EUR workspace returned',preview.status);assert.equal(preview.status,409,'USD source amounts must not be re-labelled as workspace EUR');
}finally{await f.dispose();}
