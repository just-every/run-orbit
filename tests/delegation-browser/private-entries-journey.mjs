import {expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
export async function privateEntriesJourney(page,collaborator,data){const evidence=resolve(process.env.ORBIT_PRIVATE_ENTRIES_EVIDENCE??'.orbit-viewport-evidence/private-entries');await mkdir(evidence,{recursive:true});const errors=[],expectedErrors=[];for(const current of [page,collaborator]){current.on('pageerror',error=>errors.push({message:error.message}));current.on('console',message=>{if(message.type()==='error')errors.push({message:message.text(),url:message.location().url});});}
 await page.goto(`/app/opportunities/${data.deal}`);const entry=page.locator(`#entry-${data.entries[0]}`);await expect(entry).toContainText('Synthetic note entry');await entry.getByRole('button',{name:'Make entry private',exact:true}).click();await expect(entry.getByRole('button',{name:'Private · share with collaborators',exact:true})).toHaveAttribute('aria-pressed','true');
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});await proof(page,'private-control',width,entry,'[data-testid="record-activity"]');}
 const handoff=page.locator(`#handoff-${data.handoff}`);await handoff.getByText('Open task',{exact:true}).click();await handoff.getByRole('button',{name:'Make entry private',exact:true}).click();await expect(handoff.getByRole('button',{name:'Private · share with collaborators',exact:true})).toHaveAttribute('aria-pressed','true');
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});await proof(page,'private-handoff',width,handoff,'[data-testid="handoff-tasks"]');}
 // A stored task link (/app#sales-task-<id>) opens the task at its own page.
 await page.goto(`/app#sales-task-${data.task}`);await page.waitForURL(`**/app/tasks/${data.task}`);const task=page.locator(`#task-${data.task}`);await task.getByRole('button',{name:'Make entry private',exact:true}).click();await expect(task.getByRole('button',{name:'Private · share with collaborators',exact:true})).toHaveAttribute('aria-pressed','true');
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});await proof(page,'private-task-note',width,task,`#task-${data.task}`);}
 await collaborator.goto(`/app/shared-records?kind=opportunity&id=${data.deal}`);const shared=collaborator.getByRole('region',{name:'Notes, calls and meetings',exact:true});await expect(shared).toContainText('Synthetic call entry');await expect(shared).toContainText('Synthetic meeting entry');await expect(shared).not.toContainText('Synthetic note entry');await expect(shared).not.toContainText('Synthetic task notes');await expect(shared).not.toContainText('Synthetic handoff notes');
 for(const width of [1440,390]){await collaborator.setViewportSize({width,height:900});await proof(collaborator,'shared-records',width,shared,'.shared-entries');}
 expect(errors).toEqual([]);
 const permitted=data.entries.slice(1).map(id=>`/app/shared-records?kind=opportunity&id=${data.deal}#entry-${id}`),grants='/api/v2/access/workspaces/workspace/grants';
 const json=async(response,status=200)=>{expect(response.status(),await response.text()).toBe(status);return response.json();};
 const inbox=()=>collaborator.request.get('/api/v1/notifications').then(response=>json(response));
 const mentions=()=>collaborator.request.get('/api/v1/records/mentions').then(response=>json(response));
 const visible=async(unread)=>{const current=await inbox();expect(current.notifications.map(n=>n.href).sort()).toEqual([...permitted].sort());expect(current.notifications.every(n=>n.kind==='record.mention')).toBe(true);expect(current.unread).toBe(unread);expect((await mentions()).mentions.map(m=>m.href).sort()).toEqual([...permitted].sort());return current;};
 const foreign=await json(await collaborator.request.get('/api/v1/notifications',{headers:{Cookie:data.otherCookie}}));
 expect(foreign.notifications.some(n=>n.href?.endsWith(`#entry-${data.otherEntry}`))).toBe(true);
 for(const item of data.cases){
  const {width,deal,title,grant}=item,entriesPath=`/api/v1/records/opportunity/${deal}/entries`,sharedPath=`/api/v2/workspaces/workspace/records/opportunity/${deal}/entries`;
  await page.setViewportSize({width,height:900});await collaborator.setViewportSize({width,height:900});
  await page.goto(`/app/opportunities/${deal}`);await page.getByRole('button',{name:'Add a note',exact:true}).click();
  const form=page.locator('form.manual-entry'),text=`Synthetic review at ${width}: @${data.name} please check this entry.`;
  await form.getByRole('textbox',{name:'Text',exact:true}).fill(text);
  const refused=page.waitForResponse(response=>response.url().endsWith(entriesPath)&&response.request().method()==='POST');
  await form.getByRole('button',{name:'Add note',exact:true}).click();expect((await refused).status()).toBe(409);
  expectedErrors.push({message:'Failed to load resource: the server responded with a status of 409 (Conflict)',url:new URL(entriesPath,page.url()).href});
  const prompt=form.locator('.mention-access');await expect(prompt).toContainText(`${data.name} can see this deal, but not its notes, calls and meetings.`);await expect(prompt.getByRole('button',{name:'Remove the mention',exact:true})).toBeVisible();
  const administration=await json(await page.request.get('/api/v2/access/workspaces/workspace/administration'));
  expect(administration.grants.filter(g=>g.subject_id===data.collaboratorId&&g.resource_id===deal).map(g=>[g.id,JSON.parse(g.actions_json)])).toEqual([[grant,['graph.read']]]);
  expect(await json(await collaborator.request.get(sharedPath))).toEqual({included:false,entries:[]});
  await visible(2);
  await proof(page,'mention-entries-off',width,form,'form.manual-entry');
  // This owner action explicitly enables the existing grant, then saves the refused mention.
  const saved=page.waitForResponse(response=>response.url().endsWith(entriesPath)&&response.request().method()==='POST'&&response.status()===200);
  await prompt.getByRole('button',{name:`Include notes, calls and meetings for ${data.name} on this deal`,exact:true}).click();
  const {id}=await (await saved).json(),href=`/app/shared-records?kind=opportunity&id=${deal}#entry-${id}`;permitted.push(href);
  await expect(page.locator(`#entry-${id}`)).toContainText(text);
  const current=await visible(3),notice=current.notifications.find(n=>n.href===href);expect(notice.message).toContain(title);
  await collaborator.goto('/app/notifications');await expect(collaborator.getByText('3 unread',{exact:true})).toBeVisible();
  const ownLink=collaborator.locator('.notification-list--inbox a').filter({hasText:notice.message});await expect(ownLink).toHaveAttribute('href',href);
  await expect(collaborator.locator('#mentions a')).toHaveCount(permitted.length);await expect(collaborator.locator('#mentions')).not.toContainText('Synthetic other recipient');
  await expect(collaborator.locator('#mentions')).not.toContainText('Synthetic note entry');await expect(collaborator.locator('#mentions')).not.toContainText('Synthetic task notes');await expect(collaborator.locator('#mentions')).not.toContainText('Synthetic handoff notes');
  await proof(collaborator,'mention-inbox',width,collaborator.locator('main'),'main');
  await ownLink.click();await collaborator.waitForURL('**'+href);
  const target=collaborator.locator(`#entry-${id}`),region=collaborator.getByRole('region',{name:'Notes, calls and meetings',exact:true});
  await expect(target).toBeVisible();await expect(target).toBeFocused();await expect(target).toContainText(text);
  await expect(region.getByRole('button')).toHaveCount(0);await expect(region.locator('input,textarea,[contenteditable="true"]')).toHaveCount(0);
  expect((await collaborator.request.put(`${entriesPath}/${id}`,{headers:{Origin:new URL(page.url()).origin},data:{kind:'note',text:'Refused collaborator edit',occurredAt:new Date().toISOString()}})).status()).toBe(403);
  expect((await json(await collaborator.request.get(sharedPath))).entries.find(entry=>entry.id===id).text).toBe(text);
  expect((await collaborator.request.get(`/api/v2/workspaces/workspace/records/opportunity/${data.otherDeal}/entries`)).status()).toBe(403);
  await proof(collaborator,'mention-exact-shared-entry',width,region,'.shared-entries');
  await expect.poll(async()=>(await inbox()).unread).toBe(2);
  const beforeRevoke=(await inbox()).notifications.find(n=>n.id===notice.id);
  await json(await page.request.delete(`${grants}/${grant}`,{headers:{Origin:new URL(page.url()).origin},data:{}}));
  permitted.splice(permitted.indexOf(href),1);await visible(2);
  expect((await collaborator.request.get(sharedPath)).status()).toBe(403);
  await collaborator.goto('/app/notifications');await expect(collaborator.locator(`a[href="${href}"]`)).toHaveCount(0);await expect(collaborator.getByText('2 unread',{exact:true})).toBeVisible();
  await proof(collaborator,'mention-revoked',width,collaborator.locator('main'),'main');
  await json(await page.request.post(grants,{headers:{Origin:new URL(page.url()).origin},data:{subjectKind:'operator',subjectId:data.collaboratorId,resourceType:'opportunity',resourceId:deal,actions:['graph.read','entries.read'],fields:['title'],purpose:'Resume the same entry review',expiresAt:null}}));
  permitted.push(href);expect((await visible(2)).notifications.find(n=>n.id===notice.id)).toEqual(beforeRevoke);
  await collaborator.reload();const returned=collaborator.locator('.notification-list--inbox a').filter({hasText:notice.message});await expect(returned).toHaveAttribute('href',href);await returned.click();await collaborator.waitForURL('**'+href);await expect(target).toBeVisible();await expect(target).toContainText(text);
  await proof(collaborator,'mention-regranted',width,region,'.shared-entries');
  console.log(`PROBE RECORD-023 ${width}: owner entries-off save refused; explicit sharing saved the mention; collaborator opened exact read-only entry; own notices and count isolated; revoke hid it; regrant restored the same notice and link.`);
 }
 // Only the two explicitly asserted entries-off refusals may produce HTTP console errors.
 expect(errors).toEqual(expectedErrors);
 async function proof(page,name,width,region,selector){expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);const axe=await new AxeBuilder({page}).include(selector).analyze();expect(axe.violations.filter(v=>['serious','critical'].includes(v.impact))).toEqual([]);await region.screenshot({path:`${evidence}/${name}-${width}.png`});}
}
