import assert from 'node:assert/strict';
import {expect} from '@playwright/test';
import {browserAPI} from './browser-api.mjs';
import {emailLinkSignIn,outboxLink} from './sign-in.mjs';

// Browser fetch supplies the session cookie and the native Origin on mutations.
export async function request(page,path,data,method='POST'){return browserAPI(page,path,method,data);}
export async function requestStatus(page,path){return page.evaluate(async path=>(await fetch(path)).status,path);}
async function nativeForm(page,path,form){
 const responsePromise=page.waitForResponse(response=>new URL(response.url()).pathname===path&&response.request().method()==='POST');
 await page.evaluate(async({path,form})=>{await fetch(path,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(form),redirect:'manual'});},{path,form});
 const response=await responsePromise;
 assert.equal(await response.request().headerValue('origin'),new URL(page.url()).origin,'Native form uses the browser origin');
 assert.equal(response.status(),303,`${path} must confirm its native form submission`);
}
/** rer dev serves through Vite; act on a page only after its modules load and it hydrates. */
export function settled(page){const goto=page.goto.bind(page);page.goto=(url,options)=>goto(url,{waitUntil:'networkidle',...options});return page;}

/** `rer dev` opens signed in as the owner through RER_OPEN's key exchange. */
export async function devSignIn(page,open){
 await page.goto(open);await page.waitForURL(url=>!url.pathname.startsWith('/__dev/'));
 // rer dev serves through Vite, which can reload a freshly opened page; act only once it settles.
 await page.waitForLoadState('networkidle');
}

/** Disposable data created through the same public handlers used by operators. */
export async function prepareOperatorFixture(page,browser,origin,key,ownerEmail){
 const inventory=await request(page,'/api/v1/workbench',undefined,'GET');
 const created=await request(page,'/api/v1/workbench/opportunities',{title:'Operator review opportunity',companyName:'Operator review company',contactName:'Operator review contact',email:'review@example.test',stageId:inventory.stages[0].id,valueCents:450000});
 const opportunity=await request(page,`/api/v1/opportunities/${created.id}`,undefined,'GET');
 const contact=opportunity.opportunity.contacts[0];
 const provenance={vendor:'hubspot',account:'Imported account',sourceId:'customer-1042',owner:'Account manager',stage:'Evaluation',description:'Imported customer context',additional:{region:'Pacific'}};
 await request(page,`/api/v1/records/contact/${contact.id}/entries`,{kind:'note',text:'Customer asked for a detailed walkthrough.',occurredAt:new Date().toISOString()});
 await request(page,`/api/v1/records/contact/${contact.id}` ,{name:'Operator review contact',email:'review@example.test',custom_fields:{segment:'Studio',approved:true,campaign_json:'Ordinary campaign text',import_source:JSON.stringify(provenance)}},'PUT');
 await request(page,`/api/v1/workbench/opportunities/${created.id}/events`,{type:'form.submitted',subject:'Customer requested a walkthrough',occurredAt:new Date().toISOString(),eventId:crypto.randomUUID(),contactId:contact.id});
 const timelineEntry=await request(page,`/api/v1/records/opportunity/${created.id}/entries`,{kind:'note',text:'Operator timeline review note.',occurredAt:new Date().toISOString()});
 const draft=await request(page,`/api/v1/workbench/opportunities/${created.id}/drafts`,{contactId:contact.id,subject:'Your walkthrough',body:'Thank you for your inquiry. Would Thursday suit your team?'});
 const sourceId=crypto.randomUUID();await request(page,`/api/v1/sources/${sourceId}`,{name:'Operator review source',enabled:true},'PUT');
 const workspaces=await request(page,'/api/v2/access/workspaces',undefined,'GET'),workspace=workspaces[0].workspaceId;
 const base=`/api/v2/workspaces/${workspace}/forms`;
 const form=await request(page,base,{form:{title:'Operator inquiry',fields:[{id:'name',label:'Name',required:true},{id:'email',label:'Email',required:true},{id:'message',label:'Message',required:false}],consentWording:null},landing:{title:'Operator inquiry',heading:'Tell us about your team',paragraphs:['Send your inquiry to the team.']}});
 const publication=await request(page,base+'/compile',{formId:form.id,revision:form.revision,reviewedHash:form.hash,slug:'operator-inquiry',maxRecords:100,expiresAt:new Date(Date.now()+86400000).toISOString()});
 await request(page,`${base}/publications/${publication.operationId}/approve`,{artifactHash:publication.hash,formRevision:publication.formRevision});
 await request(page,`${base}/publications/${publication.operationId}/publish`,{});
 const publicPage=await page.context().newPage();await publicPage.goto(origin+'/p/operator-inquiry');await publicPage.getByLabel('Name',{exact:true}).fill('Operator review contact');await publicPage.getByLabel('Email',{exact:true}).fill('review@example.test');await publicPage.getByLabel('Message',{exact:true}).fill('A form submission shown as labelled values.');await publicPage.getByRole('button',{name:'Submit inquiry'}).click();await expect(publicPage.getByRole('status')).toContainText('Your inquiry was received');await publicPage.close();
 // A genuine local magic-link session accepts a restricted collaborator invitation.
 const invitation=await request(page,`/api/v2/access/workspaces/${workspace}/invitations`,{email:'collaborator@example.test',role:'guest',expiresAt:new Date(Date.now()+86400000).toISOString()});
 const collaboratorContext=await browser.newContext({baseURL:origin}),collaborator=settled(await collaboratorContext.newPage());
 await emailLinkSignIn(collaborator,origin,key,'collaborator@example.test','/app/access');await collaborator.getByLabel('Invitation token').fill(invitation.token);await collaborator.getByRole('button',{name:'Accept invitation',exact:true}).click();await expect(collaborator.getByText('Invitation accepted. Your collaborator access is active.')).toBeVisible();
 const administration=await request(page,`/api/v2/access/workspaces/${workspace}/administration`,undefined,'GET'),member=administration.members.find(item=>item.email==='collaborator@example.test');
 await request(page,`/api/v2/access/workspaces/${workspace}/grants`,{subjectKind:'operator',subjectId:member.operator_id,resourceType:'contact',resourceId:contact.id,actions:['graph.read'],fields:['name','email','custom_fields_json'],purpose:'Review a shared customer',expiresAt:null});
 await nativeForm(page,'/delegation/clients',{id:'operator-browser',redirect_uri:origin+'/callback',allow_loopback:'1'});
 const authorize='/delegation/authorize?'+new URLSearchParams({client_id:'operator-browser',redirect_uri:origin+'/callback',response_type:'code',state:crypto.randomUUID(),code_challenge:'x'.repeat(43),code_challenge_method:'S256',account_id:'workspace',scope:'crm.evidence.read',targets:JSON.stringify([`opportunities/${created.id}`])});
 // Save consent through the public form handler without following the callback.
 const consent=Object.fromEntries(new URLSearchParams(authorize.split('?')[1]));
 // Minting a delegation credential needs a fresh email confirmation in this session (Base step-up).
 assert.equal(await page.evaluate(async form=>(await fetch('/delegation/authorize',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(form),redirect:'manual'})).status,consent),403);
 await page.goto(await outboxLink(origin,key,ownerEmail));await page.getByRole('button',{name:'Confirm'}).click();await page.waitForLoadState('networkidle');
 await nativeForm(page,'/delegation/authorize',consent);
 await page.goto(origin+'/app/reports');await page.getByRole('button',{name:'Set up open opportunities report',exact:true}).click();await page.getByRole('combobox',{name:'Report',exact:true}).selectOption('open-opportunities:1');await page.getByRole('button',{name:'Preview report',exact:true}).click();await page.getByRole('button',{name:'Save reviewed report',exact:true}).click();await expect(page.getByRole('heading',{name:'Saved result',exact:true})).toBeVisible();
 return {provenance,timelineEntryId:timelineEntry.id,opportunityId:created.id,contactId:contact.id,companyId:opportunity.opportunity.companyId,draftId:draft.id,authorize,collaboratorContext,collaborator};
}
