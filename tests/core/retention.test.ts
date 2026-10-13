import assert from 'node:assert/strict';
import {test} from 'node:test';
import {isolatedDatabase} from '../support/isolated-database';
import {createDependencies} from '../support/dependencies';
import {createId} from '../../src/core/shared/ids';
import {WorkbenchRepository} from '../../src/core/features/workbench/repository';
import {OutreachRepository} from '../../src/core/features/workbench/outreach-repository';
import {runOrbitTimers} from '../../src/core/features/outreach/timing-repository';
test('BASE-DATA-002 years of inactivity expire no customer evidence, drafts, notifications or audit history',async()=>{
 const platform=await isolatedDatabase();try{const db=platform.db,deps=createDependencies(db),actor=createId(),stage=createId();await deps.auth.ensureOperator({id:actor,email:'retention@example.invalid',displayName:'Retention test'});await deps.workspace.ensureWorkspace({name:'Retention test',timezone:'UTC',currency:'USD',workingHours:{days:[1,2,3,4,5],start:'08:00',end:'18:00'},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});await deps.workspace.ensurePipelineStage({id:stage,name:'Qualified',position:0});const workbench=new WorkbenchRepository(db),opportunity=await workbench.createOpportunity({title:'Retained opportunity',companyName:'Retained company',contactName:'Retained contact',email:'retained@example.invalid',stageId:stage,valueCents:0},actor);await workbench.recordEvent(opportunity.id,{type:'form.submitted',subject:'Retained evidence',occurredAt:new Date().toISOString(),eventId:createId()},actor);const contact=await db.prepare('SELECT contact_id FROM opportunity_contacts WHERE opportunity_id=?').bind(opportunity.id).first<{contact_id:string}>();await new OutreachRepository(db).createDraft(opportunity.id,{contactId:contact!.contact_id,subject:'Retained subject',body:'Retained body'},actor);
 const tables=['contacts','companies','opportunities','signals','drafts','notifications','audit_entries'];const before=Object.fromEntries(await Promise.all(tables.map(async table=>[table,(await db.prepare(`SELECT id FROM ${table}`).all<{id:string}>()).results.map(row=>row.id)])));
 await runOrbitTimers(db,undefined,new Date(Date.now()+10*365*86400000));
 for(const table of tables){const after=new Set((await db.prepare(`SELECT id FROM ${table}`).all<{id:string}>()).results.map(row=>row.id));for(const id of before[table])assert.ok(after.has(id),`${table} ${id} was automatically deleted`);}
 }finally{await platform.dispose();}
});
