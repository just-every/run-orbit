import {expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
export async function privateEntriesJourney(page,collaborator,data){const evidence=resolve('.orbit-viewport-evidence/private-entries');await mkdir(evidence,{recursive:true});const errors=[];for(const current of [page,collaborator]){current.on('pageerror',error=>errors.push(error.message));current.on('console',message=>{if(message.type()==='error')errors.push(message.text());});}
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
 async function proof(page,name,width,region,selector){expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);const axe=await new AxeBuilder({page}).include(selector).analyze();expect(axe.violations.filter(v=>['serious','critical'].includes(v.impact))).toEqual([]);await region.screenshot({path:`${evidence}/${name}-${width}.png`});}
}
