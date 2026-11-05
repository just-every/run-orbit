import {expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** The owner reads exact evidence, reviews one model request, and chooses the next internal action. */
export async function riskJourney(page,data,model,evidence){
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const read=async path=>{const response=await page.request.get(path);expect(response.status(),await response.text()).toBe(200);return response.json();};
 const path=`/app/opportunities/${data.deal}`,api=`/api/v1/risks/${data.deal}`;
 await page.setViewportSize({width:1440,height:900});await page.goto(path);
 const risks=page.getByTestId('deal-risks');
 await risks.locator(':scope > summary').click();
 const finding=kind=>risks.locator(`.deal-risk[data-kind="${kind}"]`);
 const absent=finding('absent-role'),opens=finding('opens-no-reply'),stalled=finding('stalled');
 await expect(absent.getByRole('heading')).toHaveText('No contact is recorded as decision-maker on this deal');
 await expect(absent.locator('blockquote')).toHaveText('Ana Ruiz: Champion (confirmed)');
 await expect(absent.getByText('Observation only: nothing here is inferred.',{exact:true})).toBeVisible();
 await expect(absent.getByLabel('Proposed next task')).toHaveValue('Ask Ana Ruiz who acts as decision-maker and record them on the deal');
 await expect(opens.getByRole('heading')).toHaveText(`1 reported open and no reply since “${data.subject}”`);
 await expect(opens.locator('blockquote')).toHaveText([data.subject,'Open reported by the mail provider']);
 await expect(opens.getByRole('link',{name:'Provider open report (inferred; not proof a person read it)'})).toBeVisible();
 await expect(opens.getByText(/Provider open reports are unreliable/)).toContainText('No human reply is recorded.');
 await expect(opens.getByText('Rule inference:',{exact:true})).toBeVisible();
 await expect(opens.getByLabel('Proposed next task')).toHaveValue(`Call Ana Ruiz about “${data.subject}”`);
 await expect(stalled.locator('blockquote')).toHaveText('In Qualified since 2020-01-02');
 await expect(stalled.getByText('Rule inference:',{exact:true})).toBeVisible();
 await expect(stalled.getByLabel('Proposed next task')).toHaveValue('Agree a dated next step with Ana Ruiz or close the deal');
 for(const title of [data.promiseTitle,data.taskTitle]){
  const missed=finding('missed-promise').filter({has:page.getByRole('blockquote')}).filter({hasText:title});
  await expect(missed.locator('blockquote')).toHaveText(title);
  await expect(missed.getByText('Observation only: nothing here is inferred.',{exact:true})).toBeVisible();
  await expect(missed.getByLabel('Proposed next task')).not.toBeEmpty();
 }
 // Preview through the real control; the only substituted request is the provider's HTTP edge.
 const previewResponse=page.waitForResponse(response=>response.url().endsWith(`${api}/conflicts/preview`));
 await risks.getByRole('button',{name:'Preview conflict check',exact:true}).click();
 const preview=await(await previewResponse).json();
 expect(preview.request.lines).toContainEqual(expect.objectContaining({evidenceId:`${data.deal}#commitments`,text:data.commitments}));
 expect(preview.request.lines).toContainEqual(expect.objectContaining({evidenceId:data.call,text:data.callText}));
 expect(preview.request.lines.some(line=>line.label.startsWith('Provider open'))).toBe(false);
 const exactLines=risks.getByText('Review the exact lines',{exact:true});await exactLines.click();
 await expect(risks.getByText(data.commitments,{exact:false})).toBeVisible();
 await expect(risks.getByText(data.callText,{exact:false})).toBeVisible();
 const conflict={kind:'conflicting-date',explanation:'The commitments and the logged call give different kickoff dates.',citations:[{evidenceId:`${data.deal}#commitments`,quote:'2026-11-03'},{evidenceId:data.call,quote:'2026-11-17'}],nextTask:'Confirm the kickoff date with Ana in writing'};
 model.output={findings:[{...conflict,citations:[conflict.citations[0],{evidenceId:data.call,quote:'2026-12-01'}]}]};
 const rejected=page.waitForResponse(response=>response.url().endsWith(`${api}/conflicts`));
 await risks.getByRole('button',{name:'Send this check',exact:true}).click();
 expect((await rejected).status()).toBe(502);
 await expect(risks.getByRole('alert')).toContainText('not in this deal');await expect(finding('conflicting-date')).toHaveCount(0);
 model.output={findings:[conflict]};
 await risks.getByRole('button',{name:'Send this check',exact:true}).click();
 const conflicting=finding('conflicting-date');
 await expect(conflicting.getByRole('heading')).toHaveText('Recorded dates conflict');
 await expect(conflicting.locator('blockquote')).toHaveText(['2026-11-03','2026-11-17']);
 await expect(conflicting.getByText('AI inference from the cited lines:',{exact:true})).toBeVisible();
 await expect(conflicting.getByText(conflict.explanation,{exact:false})).toBeVisible();
 await expect(conflicting.getByLabel('Proposed next task')).toHaveValue(conflict.nextTask);
 expect(model.requests).toEqual([preview.request,preview.request]);
 // Every displayed citation goes to its native recorded source, with a real target when it names one.
 const current=await read(`${api}/findings`),cited=new Set(current.findings.flatMap(item=>item.citations.map(citation=>citation.evidenceId)).concat(conflict.citations.map(citation=>citation.evidenceId)));
 const links=[];
 for(const item of current.evidence.filter(item=>cited.has(item.id))){
  const link=risks.getByRole('link',{name:item.label,exact:true}).first();await expect(link).toHaveAttribute('href',item.href);links.push(item.href);
 }
 await capture(page,risks,evidence,'deal-risks-open');
 const destination=await page.context().newPage();
 for(const href of new Set(links)){
  await destination.goto('about:blank');
  const response=await destination.goto(href);expect(response.status(),href).toBe(200);
  const anchor=new URL(href,page.url()).hash.slice(1);if(anchor)await expect(destination.locator(`[id="${anchor}"]`),href).toBeVisible();
  if(href===`/app/tasks/${data.task}`)await expect(destination.getByRole('region',{name:`Task ${data.taskTitle}`,exact:true})).toBeVisible();
 }
 await destination.close();
 // The choices are made at desktop width; phone proof shows the same expanded controls and persisted result.
 await absent.getByText('Dismiss this finding',{exact:true}).click();
 const reason='Ana owns the business and signs herself';await absent.getByLabel('Reason',{exact:true}).fill(reason);
 await absent.getByRole('button',{name:'Dismiss with reason',exact:true}).click();
 await expect(risks.getByText('Dismissed findings (1)',{exact:true})).toBeVisible();
 const roles=risks.locator('details').filter({has:page.locator('summary').filter({hasText:'Required stakeholder roles on this deal'})});
 await roles.locator(':scope > summary').click();await roles.getByRole('combobox').selectOption('procurement');
 await roles.getByLabel('Required on this deal',{exact:true}).check();
 await roles.getByLabel('Reason',{exact:true}).fill('Renewals above USD 15,000 need procurement');await roles.getByRole('button',{name:'Add rule',exact:true}).click();
 await expect(roles.getByText('Required now:',{exact:false})).toContainText('Procurement');
 const create=page.waitForResponse(response=>response.url().endsWith(`${api}/tasks`));
 await conflicting.getByLabel('Proposed next task').fill('Confirm the recorded kickoff date with Ana');
 await conflicting.getByRole('button',{name:'Approve task',exact:true}).click();
 const taskResult=await create;expect(taskResult.status()).toBe(201);const taskId=(await taskResult.json()).observed.target.split('/')[3];
 const saved=(await read(`/delegation/handoffs/${data.deal}`)).tasks.find(entry=>entry.task.id===taskId);
 expect(saved.task).toMatchObject({title:'Confirm the recorded kickoff date with Ana',status:'open',assignee_id:data.owner,evidence:[data.deal,data.call]});
 await page.reload();await risks.locator(':scope > summary').click();await risks.getByText('Dismissed findings (1)',{exact:true}).click();
 await expect(finding('absent-role').filter({hasText:'decision-maker'})).toContainText(reason);
 await expect(finding('absent-role').filter({hasText:'procurement'}).getByRole('heading')).toHaveText('No contact is recorded as procurement on this deal');
 const reloaded=await read(`${api}/findings`);expect(reloaded.rules.find(rule=>rule.role==='procurement')).toMatchObject({required:true,by:data.owner,reason:'Renewals above USD 15,000 need procurement'});
 await risks.getByText('Required stakeholder roles on this deal',{exact:true}).click();
 await capture(page,risks,evidence,'deal-risks-reviewed');
 await page.goto('about:blank');
 await page.goto(`${path}#handoff-${taskId}`);
 const task=page.getByRole('form',{name:'Confirm the recorded kickoff date with Ana',exact:true});
 await expect(task.getByLabel('Title',{exact:true})).toHaveValue('Confirm the recorded kickoff date with Ana');
 await expect(task.getByRole('combobox',{name:/^Assignee/})).toHaveValue(data.owner);
 expect(errors).toEqual([]);
}

async function capture(page,risks,evidence,name){
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});await risks.scrollIntoViewIfNeeded();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name} at ${width} fits`).toBe(true);
  const violations=(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations.filter(item=>['serious','critical'].includes(item.impact));
  expect(violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)})),`${name} at ${width}`).toEqual([]);
  await page.screenshot({path:`${evidence}/${name}-${width}.png`,fullPage:true});
 }
 await page.setViewportSize({width:1440,height:900});
}
