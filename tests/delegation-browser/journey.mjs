import {expect} from '@playwright/test';
import {randomBytes,createHash} from 'node:crypto';

export async function nativeHandoffJourney(page){
 await page.goto('/app');
 const origin=new URL(page.url()).origin,api=page.request,nonce=randomBytes(12).toString('hex');
 const post=(path,data)=>api.post(path,{headers:{Origin:origin},data});
 const inventory=await(await api.get('/api/v1/workbench')).json();
 const created=await post('/api/v1/workbench/opportunities',{title:'Delegation '+nonce,companyName:'Handoff account '+nonce,contactName:'Handoff contact',email:nonce+'@example.test',stageId:inventory.stages[0].id,valueCents:0});
 expect(created.status()).toBe(201);const body=await created.json(),opportunity=body;
 const client='slate-'+nonce,callback='https://slate.example.test/callback';
 expect((await api.post('/delegation/clients',{headers:{Origin:origin},form:{id:client,redirect_uri:callback},maxRedirects:0})).status()).toBe(303);
 // Native settings keeps the app's navigation usable on a phone, including keyboard dismissal.
 const viewport=page.viewportSize();
 await page.setViewportSize({width:390,height:844});await page.goto('/delegation/settings');
 const menu=page.getByRole('button',{name:'Menu',exact:true}),navigation=page.getByRole('navigation',{name:'Operator navigation'});
 await menu.click();await navigation.getByRole('link',{name:'Records',exact:true}).click();await page.waitForURL('**/app/records');
 await page.goto('/delegation/settings');await menu.click();await navigation.getByRole('link',{name:'Records',exact:true}).focus();await page.keyboard.press('Escape');
 await expect(navigation).toBeHidden();await expect(menu).toBeFocused();
 if(viewport)await page.setViewportSize(viewport);
 const verifier=randomBytes(32).toString('hex'),challenge=createHash('sha256').update(verifier).digest('base64url');
 const query={client_id:client,redirect_uri:callback,response_type:'code',state:nonce,code_challenge:challenge,code_challenge_method:'S256',account_id:'workspace',scope:'crm.evidence.read crm.handoff.write',targets:JSON.stringify(['opportunities/'+opportunity.id])};
 await page.goto('/delegation/authorize?'+new URLSearchParams(query));
 await expect(page.getByRole('heading',{name:'Allow this application?',exact:true})).toBeVisible();
 await expect(page.getByText('Propose handoff tasks on the chosen opportunities, for a person to accept or dismiss',{exact:true})).toBeVisible();
 await expect(page.getByText('Opportunity: Delegation '+nonce,{exact:true})).toBeVisible();
 const consent=await api.post('/delegation/authorize',{headers:{Origin:origin},form:query,maxRedirects:0});expect(consent.status()).toBe(303);
 const code=new URL(consent.headers().location).searchParams.get('code');
 const exchanged=await api.post('/api/delegation/v1/token',{form:{grant_type:'authorization_code',client_id:client,redirect_uri:callback,code,code_verifier:verifier}});expect(exchanged.status()).toBe(200);
 const token=(await exchanged.json()).access_token,headers={Authorization:'Bearer '+token};
 expect((await api.get('/api/delegation/v1/identity')).status()).toBe(401);
 // The application picks its records by name: names and target IDs of exactly what it may read.
 const listed=await(await api.get('/api/delegation/v1/records',{headers,params:{q:'delegation '+nonce}})).json();expect(listed.items).toEqual([{target:'opportunities/'+opportunity.id,kind:'crm.opportunity',name:'Delegation '+nonce}]);expect(listed.nextCursor).toBeNull();
 const target=`opportunities/${opportunity.id}/handoffs/${nonce}`;
 const check=await(await api.get('/api/delegation/v1/check',{headers,params:{target}})).json();
 const audience=await(await api.get('/api/delegation/v1/audience',{headers,params:{target,operation:'orbit.handoff.upsert'}})).json();
 const command={operationKey:nonce,operation:'orbit.handoff.upsert',target,expectedRevision:check.revision,expectedAudienceRevision:audience.audienceRevision,content:{title:'Arrange onboarding',description:'Confirm the internal owner',assigneeId:null,dueAt:null,status:'open'}};
 const effect=await api.post('/api/delegation/v1/effects',{headers,data:command});expect(effect.status()).toBe(200);const committed=await effect.json();
 await page.goto('/app/opportunities/'+opportunity.id);
 const section=page.getByTestId('handoff-tasks');await expect(section.getByLabel('Title',{exact:true})).toHaveValue('Arrange onboarding');
 // The sample workspace uses Brisbane: 09:30 local is 23:30 UTC the previous day.
 const assignees=await section.getByLabel('Assignee').locator('option').evaluateAll(nodes=>nodes.map(n=>n.value).filter(Boolean));expect(assignees.length).toBeGreaterThan(0);
 for(const status of ['completed','cancelled','open']){
  await section.getByLabel('Title',{exact:true}).fill('Native '+status);
  await section.getByLabel('Description').fill('Reviewed '+status);
  await section.getByLabel('Assignee').selectOption(status==='cancelled'?'':assignees[0]);
  await section.getByLabel(/^Due time \(/).fill('2026-10-15T09:30');
  await section.getByLabel('Status').selectOption(status);
  const saved=page.waitForResponse(r=>r.url().endsWith('/delegation/handoffs')&&r.request().method()==='POST');await section.getByRole('button',{name:'Save handoff',exact:true}).click();expect((await saved).status()).toBe(200);
  await expect(section.getByRole('heading',{name:'Native '+status,exact:true})).toBeVisible();
  const read=await(await api.get('/api/delegation/v1/effects/'+nonce,{headers})).json();
  expect(read.receipt).toEqual(committed.receipt);expect(read.observed.content).toEqual({title:'Native '+status,description:'Reviewed '+status,assigneeId:status==='cancelled'?null:assignees[0],dueAt:'2026-10-14T23:30:00.000Z',status});
 }
 await page.reload();
 await expect(section.getByLabel('Title',{exact:true})).toHaveValue('Native open');
 await expect(section.getByLabel('Status')).toHaveValue('open');
 await page.screenshot({path:'verification/ui/delegation-native-handoff.png',fullPage:true});
 expect((await api.post('/api/delegation/v1/effects',{headers,data:{...command,operationKey:'stale-'+nonce}})).status()).toBe(409);
 expect((await api.post('/api/delegation/v1/revoke',{headers,data:{}})).status()).toBe(200);
 expect((await api.get('/api/delegation/v1/effects/'+nonce,{headers})).status()).toBe(401);
 await page.goto('/delegation/settings');await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.waitForURL(/signin|\/$/);
 expect((await api.get('/api/v1/workbench')).status()).toBe(401);
}
