import {restoredPipedriveAuthority} from './pipedrive-archive-proof';
import assert from 'node:assert/strict';
import type {launchFixture} from './launch-fixture';
import {createApp} from './app';
import {createDependencies} from './dependencies';
import {createSourceSecurity} from '../../src/core/platform/source-security';
import {nativeId} from '../../src/core/features/imports/source';
import {json as responseJson,finish} from './crm-import-flow';
import {publicArchive,importCopies} from './crm-import-privacy';
import {pipedriveNetwork} from './pipedrive-network';
const json=async(response:Response|Promise<Response>)=>responseJson(await response);
type Fixture=Awaited<ReturnType<typeof launchFixture>>;
export async function pipedriveApiProof(f:Fixture,progress:(phase:string)=>void=()=>{}){
 const network=pipedriveNetwork(),token='synthetic-orbit-182-sealed-credential',security=createSourceSecurity({ORBIT_ENCRYPTION_KEY:'7a'.repeat(32)})!,session=await createDependencies(f.db).auth.createSession(f.actor);
 let now=Date.parse('2026-11-01T12:00:00Z');
 const app=()=>createApp({database:f.db,assets:{fetch:async()=>new Response(null,{status:404})},sourceSecurity:security,pipedriveFetch:network.fetcher,pipedriveNow:()=>now});
 const request=(path:string,method='GET',body?:any)=>app().request(`https://orbit.test/api/v1/${path}`,{method,headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const api=(path:string,method='GET',body?:any)=>request(`imports/pipedrive${path==='/'?'':path}`,method,body);
 const imported=()=>f.db.prepare("SELECT count(*) n FROM contacts WHERE name LIKE 'Synthetic Orbit %'").first<number>('n');
 const connect=()=>json(api('/connection','POST',{token,confirmedReadOnly:true}));
 assert.equal((await api('/connection','POST',{token,confirmedReadOnly:true})).status,403,'An ordinary operator cannot connect');assert.equal(network.requests.length,0);
 await f.db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(f.actor).run();
 network.setDenied('users/me');const refused=await api('/connection','POST',{token,confirmedReadOnly:true});assert.equal(refused.status,403);assert.match((await refused.json() as any).error,/read permission.*users\/me/);assert.equal(await f.db.prepare('SELECT count(*) n FROM crm_import_pipedrive_connections').first('n'),0);
 network.setDenied('');assert.equal((await connect()).account,'99');
 const credential=await f.db.prepare('SELECT ciphertext FROM crm_import_pipedrive_connections').first<{ciphertext:string}>();assert.ok(credential&&!credential.ciphertext.includes(token));assert.equal(await security.open(credential!.ciphertext),token);assert.ok(!JSON.stringify(await json(api('/'))).includes(token));
 progress('Connected credential is sealed; non-owner and provider refusal changed nothing.');
 // A denied field read is visible and cannot silently become an incomplete import.
 network.setDenied('organizationFields');let denied=await json(api('/pulls','POST'));for(let i=0;i<3;i++)denied=await json(api(`/pulls/${denied.id}/advance`,'POST'));assert.equal(denied.state,'permission_refused');assert.match(denied.error,/organizationFields.*Export data/);assert.equal((await api(`/pulls/${denied.id}/preview`,'POST',{stages:{},owners:{}})).status,409);assert.equal(await imported(),0);network.setDenied('');await connect();
 let pull=await json(api('/pulls','POST'));for(let i=0;i<20&&pull.state!=='waiting';i++)pull=await json(api(`/pulls/${pull.id}/advance`,'POST'));assert.equal(pull.state,'waiting');assert.equal(pull.checkpoint.cursor,'source-page-2');assert.equal(pull.counts.organizations,1);assert.equal(pull.nextAt,'2026-11-01T12:01:00.000Z');assert.equal(await imported(),0);
 const before=network.requests.length;assert.equal((await api(`/pulls/${pull.id}/advance`,'POST')).status,409);assert.equal(network.requests.length,before);
 const checkpoint=pull.checkpoint;await f.restart();pull=await json(api(`/pulls/${pull.id}`));assert.deepEqual(pull.checkpoint,checkpoint,'Actual persisted store reopens at the source cursor');assert.equal(pull.state,'waiting');now+=60001;
 for(let i=0;i<20&&pull.state!=='ready';i++)pull=await json(api(`/pulls/${pull.id}/advance`,'POST'));assert.equal(pull.state,'ready');assert.deepEqual(pull.counts,{pipelines:2,stages:2,organizationFields:2,personFields:1,dealFields:1,organizations:2,persons:3,deals:3,notes:4});assert.equal(pull.stages[0].key,'1:101');assert.equal(pull.stages[1].key,'2:201');assert.deepEqual(pull.associations,{peopleToOrganizations:3,dealsToOrganizations:3,dealsToPeople:3,noteLinks:8});
 progress('Two pipelines and all source counts reconciled after actual persisted-store reopen and rate-limit resume.');
 const second=await json(await f.request('settings/operators','POST',{email:`synthetic-orbit-182-rep${'@'}migration.test`,displayName:'Synthetic separate receiving rep'}));
 const mapping={stages:{'1:101':f.stage,'2:201':f.stage},owners:{'71':f.actor,'72':second.id}};
 const dry=await json(api(`/pulls/${pull.id}/preview`,'POST',mapping));assert.equal(await imported(),0);assert.equal(dry.counts.rejected,2);assert.equal(dry.counts.input,12);assert.equal(dry.rows.filter((row:any)=>row.kind==='note'&&row.status==='ready').length,3);assert.ok(dry.diagnostics.some((d:any)=>d.code==='UNSUPPORTED_CURRENCY'&&d.sourceId==='33'&&d.message.includes('Export data')));assert.ok(dry.diagnostics.some((d:any)=>d.code==='UNSUPPORTED_FIELD'&&d.field===network.unsupported&&d.location.pointer.includes(network.unsupported)));assert.equal(dry.owners.find((owner:any)=>owner.value==='71').count,3);assert.equal(dry.owners.find((owner:any)=>owner.value==='72').count,2);
 assert.equal((await request(`imports/${dry.id}/apply`,'POST',{fingerprint:dry.fingerprint,confirmed:false})).status,400);assert.equal(await imported(),0);
 progress('Saved dry run lists unsupported currency and fields without importing any customer.');
 // First native batch publishes every stop before it creates a customer. Inspect the real kit checkpoint.
 let applying=await json(await request(`imports/${dry.id}/apply`,'POST',{fingerprint:dry.fingerprint,confirmed:true}));assert.ok(applying.job.checkpoint>0);assert.equal(await f.db.prepare('SELECT count(*) n FROM crm_import_stops').first('n')!==0,true);await f.restart();await finish({...f,request},dry);progress('Suppression-first Apply completed from its native checkpoint.');
 const namespace='orbit:pipedrive:company-99',id=(kind:string,source:string)=>nativeId(namespace,kind,source);
 assert.equal(await imported(),3);assert.equal(await f.db.prepare("SELECT count(*) n FROM companies WHERE name LIKE 'Synthetic Orbit %'").first('n'),2);assert.equal(await f.db.prepare("SELECT count(*) n FROM opportunities WHERE title LIKE 'Synthetic Orbit %'").first('n'),2);assert.equal(await f.db.prepare("SELECT count(*) n FROM timeline_entries WHERE kind='import.note' AND actor_id=?").bind(namespace).first('n'),3);
 assert.equal(await f.db.prepare("SELECT count(*) n FROM timeline_entry_records WHERE timeline_entry_id IN(SELECT id FROM timeline_entries WHERE kind='import.note' AND actor_id=?)").bind(namespace).first('n'),7);assert.equal(await f.db.prepare('SELECT count(*) n FROM opportunity_contacts WHERE opportunity_id IN(?,?)').bind(id('deal','31'),id('deal','32')).first('n'),2);
 const contact=await json(await request(`records/contact/${id('contact','21')}`)),company=await json(await request(`records/company/${id('company','11')}`)),deal=await json(await request(`records/opportunity/${id('deal','31')}`));assert.equal(contact.record.company_id,company.record.id);assert.equal(contact.ownership.ownerId,second.id);assert.equal(company.ownership.ownerId,f.actor);assert.equal(contact.record.contactability,'do_not_contact');assert.equal(deal.record.value_cents,125025);assert.equal(deal.record.owner_id,null);assert.equal((await json(await request(`records/opportunity/${id('deal','32')}`))).record.lifecycle,'won');assert.equal(JSON.parse(contact.record.custom_fields_json)[`Pipedrive ${network.number}: Seats`],7);assert.equal(JSON.parse(company.record.custom_fields_json)[`Pipedrive ${network.text}: Region`],'North');assert.equal(await f.db.prepare('SELECT id FROM opportunities WHERE id=?').bind(id('deal','33')).first(),null);
 progress('Exact supported record, money, scalar-field, note, association and separate-owner counts reconciled.');
 // Fresh source pull, same account and exact source identities: native data and associations stay unchanged.
 let again=await json(api('/pulls','POST'));for(let i=0;i<20&&again.state!=='ready';i++)again=await json(api(`/pulls/${again.id}/advance`,'POST'));const replay=await json(api(`/pulls/${again.id}/preview`,'POST',mapping));await finish({...f,request},replay);assert.equal(await imported(),3);assert.equal(await f.db.prepare("SELECT count(*) n FROM timeline_entries WHERE kind='import.note' AND actor_id=?").bind(namespace).first('n'),3);await finish({...f,request},replay,'undo');
 progress('Unchanged connected rerun retained the original native identities and notes.');
 // A later native note retains its deal and dependency closure through source undo.
 const nativeNote=await json(await request(`records/opportunity/${id('deal','31')}/entries`,'POST',{kind:'note',text:'Later native note must survive',occurredAt:'2025-02-01T12:00:00Z'}));assert.ok(nativeNote.id);await finish({...f,request},dry,'undo');assert.equal((await json(await request(`records/opportunity/${id('deal','31')}`))).timeline.some((entry:any)=>JSON.parse(entry.payload_json).text==='Later native note must survive'),true);
 progress('Undo preserved a later native note and its dependency closure.');
 // A retained source containing a deleted person's mailbox cannot resume or expose that person.
 const fresh=await json(api(`/pulls/${again.id}/preview`,'POST',mapping));await finish({...f,request},fresh);const person=id('contact','23');await json(await request(`records/contact/${person}`,'DELETE',{confirmed:true}));assert.equal((await json(api(`/pulls/${again.id}`))).state,'withdrawn');assert.equal((await api(`/pulls/${again.id}/advance`,'POST')).status,409);assert.equal((await request(`imports/${fresh.id}/apply`,'POST',{fingerprint:fresh.fingerprint,confirmed:true})).status,409);assert.ok(!(await importCopies(f.db)).includes(network.address(23)));assert.ok(!JSON.stringify((await f.db.prepare('SELECT snapshot_json FROM crm_import_pipedrive_pulls').all()).results).includes(network.address(23)));
 progress('Erasure withdrew source snapshots, saved reviews and replay authority.');
 const archive=await publicArchive({...f,request});assert.ok(!JSON.stringify(archive).includes(token));assert.ok(!JSON.stringify(archive).includes(credential!.ciphertext));assert.ok(!JSON.stringify(archive).includes('crm_import_pipedrive'));
 await restoredPipedriveAuthority(archive,security,again.id,fresh.id);progress('The actual exported archive restored with no provider credential, pull or saved-review authority.');
 await json(api('/connection','DELETE'));assert.equal((await api('/pulls','POST')).status,409);assert.equal((await json(api('/'))).connected,false);assert.equal(await f.db.prepare('SELECT count(*) n FROM crm_import_pipedrive_connections').first('n'),0);
 assert.ok(network.requests.every(request=>request.method==='GET'&&request.authorization===`Bearer ${token}`));
}
