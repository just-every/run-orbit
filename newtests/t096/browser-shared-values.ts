import assert from 'node:assert/strict';
import {expect,type Page} from '@playwright/test';
import {join} from 'node:path';
import {writeFile} from 'node:fs/promises';

/** A guest reads the owner's permitted values, and edits in displayed units through the same fenced save. */
export async function readableSharedValues(owner:Page,guest:Page,operatorId:string,directory:string){
 await owner.goto('/app/settings/team',{waitUntil:'networkidle'});const origin=new URL(owner.url()).origin;
 async function api(path:string,method='GET',data?:unknown){
  const response=await owner.request.fetch(path,{method,headers:{Origin:origin},...(data===undefined?{}:{data})});
  assert.ok(response.ok(),method+' '+path+': '+await response.text());return response.json();
 }
 const settings=await api('/api/v1/settings'),w=settings.workspace;
 await api('/api/v1/settings','PUT',{name:w.name,timezone:'America/New_York',currency:'USD',workingHours:JSON.parse(w.working_hours_json),staleIntervalDays:w.stale_interval_days,awaitingResponseWorkingDays:w.awaiting_response_working_days,freeMailDomains:JSON.parse(w.free_mail_domains_json)});
 const stage=settings.stages[0],person=settings.operators.find((item:any)=>item.status==='active'&&!item.collaborator);
 const company=await api('/api/v1/records/company','POST',{name:'Synthetic Orbit shared company'});
 const close='2027-01-15T16:30:00.000Z',cents=1000000;
 const deal=await api('/api/v1/records/opportunity','POST',{title:'Synthetic Orbit shared proposal',stage_id:stage.id,owner_id:person.id,company_id:company.id,value_cents:cents,expected_close_at:close,custom_fields:{review_at:'Customer requested a call'}});
 const access='/api/v2/access/workspaces/workspace',record='/api/v2/workspaces/workspace/records/opportunity/'+deal.id;
 const share=async(type:string,id:string,fields:string[],actions=['graph.read'])=>api(access+'/grants','POST',{subjectKind:'operator',subjectId:operatorId,resourceType:type,resourceId:id,fields,actions,purpose:'Review readable customer values',expiresAt:null});
 await share('company',company.id,['name']);
 const fields=['title','stage_id','owner_id','company_id','value_cents','expected_close_at','closed_by','custom_fields_json','custom_fields_json.review_at'];
 const grant=await share('opportunity',deal.id,fields);
 await guest.goto('/app/shared-records?kind=opportunity&id='+deal.id,{waitUntil:'networkidle'});
 const detail=guest.getByRole('region',{name:'Shared record details'});
 await expect(detail.locator('[data-field="stage_id"]')).toContainText(stage.name);
 await expect(detail.locator('[data-field="owner_id"]')).toContainText(person.display_name);
 await expect(detail.locator('[data-field="company_id"]')).toContainText('Synthetic Orbit shared company');
 const money=new Intl.NumberFormat('en-AU',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(cents/100);
 await expect(detail.locator('[data-field="value_cents"]')).toContainText(money);
 const date=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'numeric',minute:'2-digit'}).format(new Date(close));
 await expect(detail.locator('[data-field="expected_close_at"]')).toContainText(date);
 await expect(detail.locator('[data-field="custom_fields_json.review_at"]')).toContainText('Customer requested a call');
 const text=await detail.innerText();
 for(const raw of [stage.id,person.id,company.id,String(cents),close])assert.ok(!text.includes(raw),'Shared details omit stored value '+raw);
 await guest.screenshot({path:join(directory,'shared-values-1440.png'),fullPage:true});
 await guest.setViewportSize({width:390,height:1000});await guest.screenshot({path:join(directory,'shared-values-390.png'),fullPage:true});await guest.setViewportSize({width:1440,height:1000});
 await share('opportunity',deal.id,fields,['graph.read','graph.update']);
 await guest.reload({waitUntil:'networkidle'});
 await expect(detail.locator('[data-field="custom_fields_json.review_at"] input')).toHaveValue('Customer requested a call');
 const amount=detail.getByLabel('Value (USD)',{exact:true});await expect(amount).toHaveValue(String(cents/100));
 await amount.fill('10000.25');await detail.getByRole('button',{name:'Save value',exact:true}).click();await expect(guest.getByRole('status')).toContainText('10,000.25');
 const closeInput=detail.getByLabel('Expected close date',{exact:true});await expect(closeInput).toHaveValue('2027-01-15T11:30');
 await closeInput.fill('2027-01-16T11:30');await detail.getByRole('button',{name:'Save expected close date',exact:true}).click();
 await expect(guest.getByRole('status')).toContainText('01/16/2027');
 await expect(detail.getByLabel('Stage',{exact:true}).locator('option:checked')).toHaveText(stage.name);
 await expect(detail.getByLabel('Owner',{exact:true}).locator('option:checked')).toHaveText(person.display_name);
 const saved=await api('/api/v1/records/opportunity/'+deal.id);assert.equal(saved.record.value_cents,1000025);assert.equal(saved.record.expected_close_at,'2027-01-16T16:30:00.000Z');
 await api('/api/v1/records/opportunity/'+deal.id+'/lifecycle','POST',{state:'won',reason:'Customer confirmed the readable proposal'});
 const closed=await api('/api/v1/records/opportunity/'+deal.id),closingPerson=settings.operators.find((item:any)=>item.id===closed.record.closed_by);
 assert.ok(closingPerson);await guest.reload({waitUntil:'networkidle'});
 await expect(detail.locator('[data-field="closed_by"]')).toContainText(closingPerson.display_name);
 assert.ok(!(await detail.locator('[data-field="closed_by"]').innerText()).includes(closingPerson.id));
 await api(access+'/grants/'+grant.id,'DELETE');
 await writeFile(join(directory,'shared-values.json'),JSON.stringify({readable:true,storedCents:saved.record.value_cents,storedClose:saved.record.expected_close_at,assertionWidth:1440,proofWidths:[1440,390]},null,2));
}
