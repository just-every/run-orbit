import type {Page} from '@playwright/test';
import {accessible} from './browser-observations';
/** Observe the completed screen after finite focus and hover transitions. */
export async function captureOwnership(page:Page,name:string,directory:string){
 await page.mouse.move(0,0);
 await page.waitForFunction(()=>!document.getAnimations().some(animation=>animation instanceof CSSTransition&&animation.playState==='running'));
 await accessible(page,name,directory);
 const panel=name.startsWith('ownership-rule-preview')?page.getByRole('region',{name:'Assignment rules',exact:true})
  :name.startsWith('ownership-removal')?page.getByRole('region',{name:'Operator removal review',exact:true})
  :name.startsWith('ownership-sales-editor')?page.locator('.sales-editor')
  :name.startsWith('ownership-sales-result')?page.locator('.sales-section').first()
  :name.startsWith('ownership-report-editor')?page.locator('details.fold-panel').filter({has:page.getByText('Create or edit a report from your records',{exact:true})})
  :name.startsWith('ownership-report-result')?page.locator('.analytics-console__measurement').first()
  :name.startsWith('ownership-handover-result')?page.getByRole('region',{name:'Record ownership',exact:true}):null;
 if(panel)await panel.screenshot({path:`${directory}/${name}-panel.png`});
}
