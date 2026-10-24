import {typedFieldsProof} from '../support/typed-fields-proof';
import { testState } from '../support/test-state';
import assert from 'node:assert/strict';
import { after,test } from 'node:test';
import { getPlatformProxy } from 'wrangler';
import { RecordsRepository } from '../../src/core/features/records/repository';
import { TestDataRepository as DataRepository } from '../support/record-data';
import { createId } from '../../src/core/shared/ids';
const platform=await getPlatformProxy<{DB:D1Database}>({configPath:'wrangler.jsonc',envFiles:['tests/support/no-local-settings.env'],persist:{path:process.env.RECORDS_TEST_STATE??`${testState()}/v3`},remoteBindings:false});after(()=>platform.dispose());
const db=platform.env.DB,records=new RecordsRepository(db),data=new DataRepository(db);
async function fixture(){const actor=createId(),stage=createId(),now=new Date().toISOString();await db.prepare("INSERT INTO operators(id,email,display_name,status,created_at,updated_at) VALUES(?,?,?,'active',?,?)").bind(actor,`${actor}@test.example`,'Records operator',now,now).run();await db.prepare('INSERT INTO pipeline_stages SELECT ?,?,COALESCE(MAX(position),0)+1,?,? FROM pipeline_stages').bind(stage,'Records stage',now,now).run();return {actor,stage};}
test('RECORD-014 typed contact, company and deal fields preview changes, refuse invalid and concurrent duplicate values, and preserve archived meaning',async()=>{
 await typedFieldsProof();
});
test('RECORD-013 DATA-002 customer history survives one deal deletion, then contact erasure removes mail and linked signals and recomputes the surviving deal',async()=>{
 const {actor,stage}=await fixture(),email=`${createId()}@history.test`;
 const contact=await records.save('contact',{name:'Mail history contact',email},actor);
 const opp=await records.save('opportunity',{title:'Mail history',stage_id:stage,value_cents:0,contact_ids:[contact.id],primary_contact_id:contact.id},actor);
 const survivor=await records.save('opportunity',{title:'Signal erasure opportunity',stage_id:stage,value_cents:0,contact_ids:[contact.id],primary_contact_id:contact.id},actor);
 const message=createId(),now=new Date().toISOString();
 await db.prepare("INSERT INTO outbound_messages(id,revision,opportunity_id,operator_id,contact_id,recipient_email,subject,body,state,created_at,updated_at,idempotency_key,message_id,approved_at) VALUES(?,1,?,?,?,?,?,?,'accepted',?,?,?,?,?)").bind(message,opp.id,actor,contact.id,email,'Retained subject','Retained customer body',now,now,message,`<${message}@orbit.test>`,now).run();
 const {WorkbenchRepository}=await import('../../src/core/features/workbench/repository');
 const signal=await new WorkbenchRepository(db).recordEvent(survivor.id,{type:'meeting.booked',subject:'Personal signal subject',occurredAt:now,eventId:createId(),contactId:contact.id},actor);
 await data.remove('opportunity',opp.id,actor);
 const timeline=(await records.detail('contact',contact.id)).timeline;
 assert.ok(timeline.some((t:any)=>t.payload_json.includes('Retained customer body')));
 await data.remove('contact',contact.id,actor);
 assert.ok(!JSON.stringify(await data.export()).includes('Retained customer body'));
 assert.ok(!JSON.stringify(await data.export()).includes(email));
 assert.equal(await db.prepare('SELECT id FROM signals WHERE id=?').bind(signal.id).first(),null);
 const detail=await records.detail('opportunity',survivor.id);
 assert.equal(detail.record.score,0);
 assert.ok(!JSON.stringify(await data.export()).includes('Personal signal subject'));
});
