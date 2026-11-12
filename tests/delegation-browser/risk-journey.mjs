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
 await quoteJourney(page,data,model,evidence);
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

/** Build the native USD proposal in the browser, then inspect the model's cited quote-call conflict. */
async function quoteJourney(page,data,model,evidence){
 await page.goto('/app/settings/workspace#quote-products');
 const book=page.getByRole('region',{name:'Products and USD price book',exact:true});
 await book.getByText('Add product',{exact:true}).click();
 const create=book.getByRole('form',{name:'New product',exact:true});
 for(const [name,price] of [['Synthetic quote licence','100.01'],['Synthetic quote setup','250.00']]){
  await create.getByLabel('Product name',{exact:true}).fill(name);await create.getByLabel('USD unit price',{exact:true}).fill(price);
  await create.getByRole('button',{name:'Create product',exact:true}).click();
  await expect(book.getByRole('form',{name:`Product ${name}`,exact:true})).toBeVisible();
 }
 await capture(page,book,evidence,'quote-price-book');
 await page.goto(`/app/opportunities/${data.deal}`);
 const panel=page.getByTestId('deal-quotes');await panel.getByRole('button',{name:'Create quote',exact:true}).click();
 const form=panel.getByRole('form',{name:'Quote version',exact:true});
 const first=form.getByRole('group',{name:'Line 1',exact:true}),second=form.getByRole('group',{name:'Line 2',exact:true});
 await first.getByRole('combobox',{name:'Product',exact:true}).selectOption({label:'Synthetic quote licence'});await first.getByLabel('Quantity',{exact:true}).fill('2');await first.getByLabel('Line discount (USD)',{exact:true}).fill('10.02');
 await second.getByRole('combobox',{name:'Product',exact:true}).selectOption({label:'Synthetic quote setup'});
 await second.getByText('Override unit price',{exact:true}).click();await second.getByLabel('Override price (USD)',{exact:true}).fill('240.00');await second.getByLabel('Override reason',{exact:true}).fill('Reviewed setup concession');
 await form.getByLabel('Quote discount (USD)',{exact:true}).fill('30.00');await form.getByLabel('Expires on',{exact:true}).fill('2030-11-03');
 await form.getByRole('combobox',{name:'US sales-tax treatment',exact:true}).selectOption('added');await form.getByLabel('Tax rate (percent)',{exact:true}).fill('8.25');
 const disclosure='US sales tax added at 8.25 percent for the reviewed destination; no automated tax determination.';
 await form.getByLabel('US sales-tax disclosure',{exact:true}).fill(disclosure);
 const save=async()=>{const response=page.waitForResponse(r=>r.url().endsWith(`/api/v1/quotes/deals/${data.deal}`)&&r.request().method()==='POST');await form.getByRole('button',{name:'Save new version',exact:true}).click();const saved=await response;expect(saved.status(),await saved.text()).toBe(201);return saved.json();};
 await capture(page,panel,evidence,'quote-editor');
 const v1=await save();expect(v1.content.totalCents).toBe(43300);
 await expect(panel.getByText('USD 433.00',{exact:true})).toBeVisible();await expect(panel.getByText(disclosure,{exact:true})).toBeVisible();
 await expect(panel.locator('p').filter({hasText:'Reviewed setup concession'})).toBeVisible();await expect(panel.locator('p').filter({hasText:'Reviewed setup concession'})).toContainText('Override from USD 250.00: Reviewed setup concession');
 await panel.getByRole('button',{name:'Edit current quote',exact:true}).click();await form.getByLabel('Expires on',{exact:true}).fill('2030-11-17');
 const v2=await save();expect(v2.version).toBe(2);expect(v2.content.totalCents).toBe(43300);
 await expect(panel.locator(`#quote-${v2.id}`)).toBeVisible();
 const old=panel.locator(`#quote-${v1.id}`);await old.locator(':scope > summary').click();
 await expect(old.getByText('Issued ',{exact:false})).toContainText('2030-11-03');
 await old.getByRole('button',{name:'Review version 1',exact:true}).click();await expect(panel.getByRole('alert')).toContainText('Current quote is version 2');
 await expect(panel.locator(`#quote-${v2.id}`)).toContainText('2030-11-17');
 const risks=page.getByTestId('deal-risks');await risks.locator(':scope > summary').click();
 const endpoint=`/api/v1/risks/${data.deal}/conflicts`;
 const previewResponse=page.waitForResponse(r=>r.url().endsWith(endpoint+'/preview'));await risks.getByRole('button',{name:'Preview conflict check',exact:true}).click();const preview=await(await previewResponse).json();
 expect(preview.request.lines).toContainEqual(expect.objectContaining({evidenceId:v1.id,label:'Quote version 1'}));expect(preview.request.lines).toContainEqual(expect.objectContaining({evidenceId:v2.id,label:'Quote version 2'}));
 const conflict={kind:'conflicting-date',explanation:'The current quote and the logged call give different quote expiration dates.',citations:[{evidenceId:v2.id,quote:'2030-11-17'},{evidenceId:data.call,quote:'2030-12-01'}],nextTask:'Confirm the quote expiration with Ana before sending'};
 model.output={findings:[conflict]};await risks.getByRole('button',{name:'Send this check',exact:true}).click();
 const finding=risks.locator('.deal-risk[data-kind="conflicting-date"]');await expect(finding.locator('blockquote')).toHaveText(['2030-11-17','2030-12-01']);await expect(finding.getByLabel('Proposed next task')).toHaveValue(conflict.nextTask);
 expect(model.requests.at(-1)).toEqual(preview.request);
 const citation=finding.getByRole('link',{name:'Quote version 2',exact:true});await expect(citation).toHaveAttribute('href',`/app/opportunities/${data.deal}#quote-${v2.id}`);
 await capture(page,risks,evidence,'quote-call-conflict');
 await citation.click();await expect(panel.locator(`#quote-${v2.id}`)).toBeVisible();
}
