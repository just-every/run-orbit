import assert from 'node:assert/strict';
import {writeFile,chmod} from 'node:fs/promises';
import {join} from 'node:path';
import type {Browser,BrowserContext,Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const tracingSandboxMessage="Blocked script execution in 'about:srcdoc' because the document's frame is sandboxed and the 'allow-scripts' permission is not set.";
export function watchBrowser(context:BrowserContext){
 const pageErrors:string[]=[],consoleErrors:{message:string;url:string;tracing:boolean}[]=[],consolePages:Page[]=[],expectedDenials:{path:string;status:number}[]=[];
 context.on('page',page=>{page.on('pageerror',error=>pageErrors.push(error.message));page.on('console',message=>{if(message.type()==='error'){consoleErrors.push({message:message.text(),url:message.location().url,tracing:traces.has(context)});consolePages.push(page);}});});
 return{allowDeniedResource(path:string,status:number){expectedDenials.push({path,status});},async check(directory:string,name:string){
  // Snapshot tracing injects into the deliberately script-free sandboxed preview.
  // A failed or unavailable DOM observation cannot classify an error as expected.
  const inertPreviews=new Set<Page>();
  await Promise.all([...new Set(consolePages.filter((_page,index)=>consoleErrors[index]!.tracing&&consoleErrors[index]!.url==='about:srcdoc'&&consoleErrors[index]!.message===tracingSandboxMessage))].map(async page=>{try{if(await page.locator('iframe[title="Compiled landing page preview"]').evaluateAll(elements=>elements.some(element=>element.getAttribute('sandbox')===''&&element.hasAttribute('srcdoc')&&!/<script\b/i.test(element.getAttribute('srcdoc')!))))inertPreviews.add(page);}catch{}}));
  const expectedTracingSandboxErrors=consoleErrors.filter((error,index)=>error.tracing&&error.url==='about:srcdoc'&&error.message===tracingSandboxMessage&&inertPreviews.has(consolePages[index]!));
  const expectedNetworkFailures=consoleErrors.filter(error=>{try{return /Failed to load resource/.test(error.message)&&expectedDenials.some(denial=>new URL(error.url).pathname===denial.path&&error.message.includes(String(denial.status)));}catch{return false;}}),unexpectedConsoleErrors=consoleErrors.filter(error=>!expectedNetworkFailures.includes(error)&&!expectedTracingSandboxErrors.includes(error));
  await writeFile(join(directory,name+'.errors.json'),JSON.stringify({pageErrors,consoleErrors,expectedDenials,expectedNetworkFailures,expectedTracingSandboxErrors,unexpectedConsoleErrors}),{mode:0o600});assert.deepEqual(pageErrors,[]);assert.deepEqual(unexpectedConsoleErrors,[]);
 }};
}
const checkedScreens=new Set<string>();
export async function accessible(page:Page,name:string,directory:string){
 const url=new URL(page.url()),dialogs=await page.getByRole('dialog').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')??node.getAttribute('aria-labelledby')??'dialog').join(','));
 const key=`${url.origin}${url.pathname.replace(/\/[A-Z0-9]{26}(?=\/|$)/g,'/:id')}:${await page.evaluate(()=>innerWidth)}:${dialogs}`;
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${name} must not overflow`);
 if(checkedScreens.has(key))return;
 checkedScreens.add(key);// The reviewed preview deliberately forbids scripts; the public form is checked on its own page.
 const result=await new AxeBuilder({page}).exclude('iframe[title="Compiled landing page preview"][sandbox=""]').analyze(),severe=result.violations.filter(v=>['serious','critical'].includes(v.impact??''));assert.deepEqual(severe.map(v=>({id:v.id,impact:v.impact})),[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,`${name} must not overflow`);await page.screenshot({path:join(directory,name+'.png'),fullPage:true});await writeFile(join(directory,name+'.axe.json'),JSON.stringify({violations:result.violations.map(v=>({id:v.id,impact:v.impact})),seriousCritical:severe.length}),{mode:0o600});}

const traces=new WeakMap<BrowserContext,{directory:string;name:string}>();
export async function startTrace(context:BrowserContext,directory:string,name:string){await context.tracing.start({screenshots:true,snapshots:true,sources:true});traces.set(context,{directory,name});}
export async function stopTrace(context:BrowserContext){const trace=traces.get(context);if(!trace)return;const path=join(trace.directory,trace.name+'.trace.zip');await context.tracing.stop({path});await chmod(path,0o600);traces.delete(context);}
export async function closeTracedBrowser(browser:Browser|undefined){if(!browser)return;try{for(const context of browser.contexts())await stopTrace(context);}finally{await browser.close();}}
