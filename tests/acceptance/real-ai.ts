import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {isolatedDatabase} from '../support/isolated-database';
import {createAIProvider} from '../../src/core/features/assistance/provider';
import {createApp} from '../support/app';
import {createDependencies} from '../support/dependencies';
import {WorkbenchRepository} from '../../src/core/features/workbench/repository';
import {createId} from '../../src/core/shared/ids';
const path=process.env.ORBIT_PRIVATE_CONFIG;if(!path)throw new Error('ORBIT_PRIVATE_CONFIG is required for explicitly authorized real AI acceptance.');
const privateConfig=JSON.parse(await readFile(path,'utf8')),provider=createAIProvider(privateConfig);assert.ok(provider);
const platform=await isolatedDatabase(),db=platform.db;
try{
 const dependencies=createDependencies(db),actor=createId(),stage=createId();await dependencies.auth.ensureOperator({id:actor,email:'orbit-ai-acceptance@example.invalid',displayName:'Test-owned AI acceptance'});await dependencies.workspace.ensureWorkspace({name:'Test-owned workspace',timezone:'UTC',currency:'USD',workingHours:{days:[1,2,3,4,5],start:'08:00',end:'18:00'},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});await dependencies.workspace.ensurePipelineStage({id:stage,name:'Evaluation',position:0});
 const workbench=new WorkbenchRepository(db),opportunity=await workbench.createOpportunity({title:'Test-owned installation evaluation',companyName:'Acceptance test organisation',contactName:'Acceptance test contact',email:'orbit-ai-contact@example.invalid',stageId:stage,valueCents:0},actor);await workbench.recordEvent(opportunity.id,{type:'form.submitted',subject:'Requested a short installation checklist for evaluation.',occurredAt:new Date().toISOString(),eventId:createId()},actor);
 const session=await dependencies.auth.createSession(actor),app=createApp({database:db,assets:{fetch:async()=>new Response('')},aiProvider:provider});
 async function post(route:string,body:unknown){return app.request(`https://orbit.test/api/v1/assistance/${route}`,{method:'POST',headers:{origin:'https://orbit.test',cookie:`__Host-orbit_session=${session.token}`,'content-type':'application/json'},body:JSON.stringify(body)});}
 const previewResponse=await post('preview',{opportunityId:opportunity.id,feature:'draft'});assert.equal(previewResponse.status,200);const preview=await previewResponse.json() as {id:string;preview:{evidence:{id:string}[]}};
 const response=await post('generate',{previewId:preview.id});assert.equal(response.status,200,`Real AI generation failed HTTP ${response.status}; inspect the private test database while available.`);const result=await response.json() as {draftId:string;output:{body:string;evidenceIds:string[]}};
 assert.ok(result.draftId);assert.ok(result.output.evidenceIds.every(id=>preview.preview.evidence.some(e=>e.id===id)));assert.ok(result.output.body.split(/\s+/).length<=150);
 const usage=await db.prepare('SELECT provider,model,input_tokens,output_tokens,cached_input_tokens,estimated_cost,duration_ms,status FROM ai_calls WHERE opportunity_id=?').bind(opportunity.id).first();assert.ok(usage);assert.equal(usage.status,'success');assert.equal((await db.prepare('SELECT count(*) AS n FROM outbound_messages').first<{n:number}>())!.n,0);
 const proof={observedAt:new Date().toISOString(),runtime:'Isolated real D1 and actual configured OpenAI Responses API; test-issued native session for this scoped AI check',provider:provider.provider,model:provider.model,previewHash:createHash('sha256').update(JSON.stringify(preview.preview)).digest('hex'),draftHash:createHash('sha256').update(result.output.body).digest('hex'),evidenceValidated:true,wordLimitValidated:true,durableUnsentDraft:true,outboundMessages:0,usage,limitations:'One test-owned record and one actual generation. This is not the native emailed sign-in or customer-mail acceptance proof.'};
 await mkdir('verification',{recursive:true});await writeFile('verification/real-ai.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof,null,2));
}finally{await platform.dispose();}
