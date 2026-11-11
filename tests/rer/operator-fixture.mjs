import assert from 'node:assert/strict';
import {expect} from '@playwright/test';
import {browserAPI} from './browser-api.mjs';
import {notificationAutomation} from '../support/notification-automation.mjs';

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
 assert.equal((await request(page,'/api/v1/notifications',undefined,'GET')).notifications.filter(row=>row.opportunityId===created.id).length,0,'Creating an opportunity directly never notifies its own actor');
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
 const publicPage=await page.context().newPage();await publicPage.goto(origin+'/p/operator-inquiry');await publicPage.getByLabel('Name',{exact:true}).fill('Operator review contact');await publicPage.getByLabel('Email',{exact:true}).fill('review@example.test');await publicPage.getByLabel('Message',{exact:true}).fill('A form submission shown as labelled values.');await publicPage.getByRole('button',{name:'Submit enquiry'}).click();await expect(publicPage.getByRole('status')).toContainText('Your enquiry was received');await publicPage.close();
 // Use the native dev collaborator; role and grants still go through public access routes.
 const collaboratorContext=await browser.newContext({baseURL:origin,extraHTTPHeaders:{'x-rer-dev-key':key}}),collaborator=settled(await collaboratorContext.newPage());
 await collaborator.goto(origin+'/auth/dev/enter?as=collaborator&returnTo=/app/access');
 const administration=await request(page,`/api/v2/access/workspaces/${workspace}/administration`,undefined,'GET'),member=administration.members.find(item=>item.email==='collaborator@dev.localhost');
 await request(page,`/api/v2/access/workspaces/${workspace}/members/${member.operator_id}`,{role:'guest',status:'active'},'PUT');
 await collaborator.goto(origin+'/auth/dev/enter?as=collaborator&returnTo=/app/access');
 await request(page,`/api/v2/access/workspaces/${workspace}/grants`,{subjectKind:'operator',subjectId:member.operator_id,resourceType:'contact',resourceId:contact.id,actions:['graph.read'],fields:['name','email','custom_fields_json'],purpose:'Review a shared customer',expiresAt:null});
 await nativeForm(page,'/delegation/clients',{id:'operator-browser',redirect_uri:origin+'/callback',allow_loopback:'1'});
 const authorize='/delegation/authorize?'+new URLSearchParams({client_id:'operator-browser',redirect_uri:origin+'/callback',response_type:'code',state:crypto.randomUUID(),code_challenge:'x'.repeat(43),code_challenge_method:'S256',account_id:'workspace',scope:'crm.evidence.read',targets:JSON.stringify([`opportunities/${created.id}`])});
 // Save consent through the public form handler without following the callback.
 const consent=Object.fromEntries(new URLSearchParams(authorize.split('?')[1]));
 await nativeForm(page,'/delegation/authorize',consent);
 await page.goto(origin+'/app/reports');await page.getByRole('link',{name:'Open opportunities',exact:true}).click();await page.getByRole('button',{name:'Save result',exact:true}).click();await expect(page.getByText(/^Saved result · measured /)).toBeVisible();
 const openFullOperator=async()=>{
  const context=await browser.newContext({baseURL:origin,extraHTTPHeaders:{'x-rer-dev-key':key},viewport:{width:1440,height:900}}),operator=settled(await context.newPage());
  try{await operator.goto(origin+'/auth/dev/enter?as=seller&returnTo=/app');assert.deepEqual(await request(operator,'/api/v2/access/class',undefined,'GET'),{access_class:'native_full'});return {context,page:operator};}
  catch(error){await context.close();throw error;}
 };
 const ownerId=(await request(page,'/api/v1/settings',undefined,'GET')).operators.find(row=>row.email===ownerEmail).id;
 const colleague=await openFullOperator();
 try{
  await request(colleague.page,'/api/v1/tasks',{title:'Colleague requested opportunity review',recordType:'opportunity',recordId:created.id,ownerId,dueAt:new Date(Date.now()+86400000).toISOString(),priority:'normal',type:'follow_up',notes:'',recurrence:'none',timezone:'UTC',reminderMinutes:null});
  assert.ok((await request(page,'/api/v1/notifications',undefined,'GET')).notifications.some(row=>row.kind==='task.assigned'&&row.opportunityId===created.id&&!row.readAt),'Another person still notifies this operator about the opportunity');
 }finally{await colleague.context.close();}
 await notificationAutomation((path,body)=>request(page,path,body,body===undefined?'GET':'POST'),{kind:'opportunity',id:created.id,title:'Operator review opportunity',ownerId});
 return {provenance,timelineEntryId:timelineEntry.id,opportunityId:created.id,contactId:contact.id,companyId:opportunity.opportunity.companyId,draftId:draft.id,authorize,collaboratorContext,collaborator,openFullOperator};
}
