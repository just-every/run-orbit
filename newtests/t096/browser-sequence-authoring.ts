import assert from 'node:assert/strict';
import type {Browser} from '@playwright/test';
import {expect} from '@playwright/test';
import {accessible,watchBrowser,startTrace,stopTrace} from './browser-observations';

/** Operate the populated definition, independent copy and immutable history at both widths. */
export async function sequenceAuthoringBrowserJourney(browser:Browser,origin:string,directory:string,cookie:string,receiver:{id:string;cookie:string}){
 for(const width of [1440,390]){
  const context=await browser.newContext({baseURL:origin,viewport:{width,height:1000},ignoreHTTPSErrors:true,extraHTTPHeaders:{Cookie:cookie}}),errors=watchBrowser(context),page=await context.newPage();
  await startTrace(context,directory,`sequences-${width}`);
  try{
   await page.goto('/app/sequences');await expect(page.getByRole('heading',{name:'Sequences',exact:true,level:1})).toBeVisible();await page.getByRole('link',{name:'New sequence',exact:true}).click();
   await page.getByLabel('Sequence name',{exact:true}).fill(`Northstar operations introduction ${width}`);
   const email=page.getByRole('group',{name:'Step 1 · Email',exact:true});await email.getByLabel('Subject',{exact:true}).fill('Review your operations rollout');await email.getByLabel('Body',{exact:true}).fill('Could we review the implementation milestones together next week?');
   for(const [kind,label,title,instructions]of [['wait','Wait','',''],['call','Call task','Call about the rollout','Ask which milestones need support.'],['meeting','Meeting','Review the implementation plan','Prepare the agenda and confirm the meeting manually.'],['linkedin','Manual LinkedIn','Connect with the operations lead','Review the profile and write a personal note manually.']] as const){
    await page.getByLabel('New step type',{exact:true}).selectOption(kind);await page.getByRole('button',{name:'Add step',exact:true}).click();const group=page.getByRole('group',{name:new RegExp(`Step [2-5] · ${label}$`)});await group.getByLabel('Delay in business days',{exact:true}).fill('1');await group.getByLabel('Condition',{exact:true}).selectOption(kind==='meeting'?'task_completed':kind==='linkedin'?'no_meeting':'no_reply');if(title){await group.getByLabel('Task title',{exact:true}).fill(title);await group.getByLabel('Instructions',{exact:true}).fill(instructions);}
   }
   await page.getByRole('button',{name:'Create private sequence',exact:true}).click();await expect(page).toHaveURL(/\/app\/sequences\/[0-9A-Z]{26}$/);const id=new URL(page.url()).pathname.split('/').at(-1)!;
   await expect(page.getByText(/Version 1 · Private/)).toBeVisible();await accessible(page,`sequences-private-editor-${width}`,directory);
   await page.getByRole('button',{name:'Share with workspace',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Shared with all full operators'})).toBeVisible();await expect(page.getByText(/Workspace shared/).first()).toBeVisible();
   await page.getByRole('group',{name:'Step 1 · Email',exact:true}).getByLabel('Subject',{exact:true}).fill('Confirm the next rollout milestone');await page.getByRole('button',{name:'Save new version',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Saved version 3'})).toBeVisible();
   await page.getByLabel('Start time (UTC)',{exact:true}).fill('2030-03-08T14:00');await page.getByRole('button',{name:'Preview saved schedule',exact:true}).click();await expect(page.locator('.sequence-preview li')).toHaveCount(5);
   const history=page.getByRole('region',{name:'Version history',exact:true});await history.getByText(`Version 1 · Northstar operations introduction ${width}`,{exact:true}).click();await expect(history.getByText('Review your operations rollout',{exact:false})).toBeVisible();await expect(history.getByText('Confirm the next rollout milestone',{exact:true})).toHaveCount(0);await accessible(page,`sequences-version-history-${width}`,directory);
   await page.getByRole('link',{name:'Sequences',exact:true}).click();await expect(page.getByRole('link',{name:`Northstar operations introduction ${width}`,exact:true})).toBeVisible();await expect(page.getByText('Email → Wait → Call task → Meeting → Manual LinkedIn').first()).toBeVisible();await accessible(page,`sequences-populated-list-${width}`,directory);
   const second=await browser.newContext({baseURL:origin,viewport:{width,height:1000},ignoreHTTPSErrors:true,extraHTTPHeaders:{Cookie:receiver.cookie}}),secondErrors=watchBrowser(second),copyPage=await second.newPage();
   try{
    await copyPage.goto(`/app/sequences/${id}`);await expect(copyPage.getByText('This shared sequence is read-only. Make a private copy to edit it.',{exact:true})).toBeVisible();await expect(copyPage.getByLabel('Sequence name',{exact:true})).toBeDisabled();await copyPage.getByLabel('Private copy name',{exact:true}).fill(`Jordan rollout plan ${width}`);await copyPage.getByRole('button',{name:'Create private copy',exact:true}).click();await expect(copyPage).toHaveURL(/\/app\/sequences\/[0-9A-Z]{26}$/);const copyId=new URL(copyPage.url()).pathname.split('/').at(-1)!;assert.notEqual(copyId,id);await expect(copyPage.getByText(/Version 1 · Private/)).toBeVisible();await expect(copyPage.getByText(`Independent copy of sequence ${id}, version 3. This copy has its own version history.`,{exact:true})).toBeVisible();await copyPage.getByLabel('Sequence name',{exact:true}).fill(`Jordan independent rollout ${width}`);await copyPage.getByRole('button',{name:'Save new version',exact:true}).click();await expect(copyPage.getByRole('status').filter({hasText:'Saved version 2'})).toBeVisible();await accessible(copyPage,`sequences-independent-copy-${width}`,directory);const original=await context.request.get(`/api/v1/sequences/${id}`);assert.equal((await original.json()).name,`Northstar operations introduction ${width}`);await secondErrors.check(directory,`sequences-copy-${width}`);
   }finally{await second.close();}
   await errors.check(directory,`sequences-${width}`);
  }finally{await stopTrace(context);await context.close();}
 }
}
