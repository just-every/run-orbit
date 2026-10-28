import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createReadStream} from 'node:fs';
import {Readable} from 'node:stream';
import {join} from 'node:path';
import {exerciseRollback} from './rollback.mjs';
const root=fileURLToPath(new URL('../..',import.meta.url));
async function authenticate(context,targetOwner=false){const session=JSON.parse(execFileSync(process.execPath,[join(root,'node_modules/tsx/dist/cli.mjs'),join(root,'tests/archive/session.ts'),...(targetOwner?['--target-owner']:[])],{cwd:root,encoding:'utf8'}));await context.setExtraHTTPHeaders({Cookie:`${session.cookieName}=${session.token}`});await context.addCookies([{name:session.cookieName,value:session.token,url:`https://127.0.0.1:${process.env.ORBIT_ARCHIVE_PORT??8723}`,secure:true,httpOnly:true,sameSite:'Lax'}]);return session;}
async function discardExport(page){
 const response=page.waitForResponse(response=>response.request().method()==='POST'&&/\/archive\/exports\/[^/]+\/abort$/.test(new URL(response.url()).pathname));
 await page.getByRole('button',{name:'Discard export',exact:true}).click();
 await page.getByRole('dialog',{name:'Discard export'}).getByRole('button',{name:'Discard export',exact:true}).click();
 expect((await response).status()).toBe(200);
 await expect(page.getByRole('button',{name:'Discard export',exact:true})).toHaveCount(0);
}
async function openTools(page){await page.goto('/app/records');await page.getByText('Import, duplicate review and data export',{exact:true}).click();}
test('native archive preparation, streamed download, confirmed restore and renewed session preserve workspace records',async({page,context},testInfo)=>{
 test.setTimeout(360_000);
 const sourceSession=await authenticate(context);await openTools(page);
 await page.getByRole('button',{name:'Prepare export',exact:true}).click();
 await expect(page.getByRole('link',{name:'Download completed archive'})).toBeVisible({timeout:90_000});
 const preparedId=await page.getByLabel('Export transfer ID').inputValue();await page.reload();await page.getByText('Import, duplicate review and data export',{exact:true}).click();await expect(page.getByLabel('Export transfer ID')).toHaveValue(preparedId);await page.getByRole('button',{name:'Resume export',exact:true}).click();await expect(page.getByRole('link',{name:'Download completed archive'})).toHaveAttribute('href',new RegExp(preparedId+'/download$'));
 const downloadPromise=page.waitForEvent('download');await page.getByRole('link',{name:'Download completed archive'}).click();const download=await downloadPromise;const file=await download.path();expect(file).toBeTruthy();
 // Assert browser used a real streamed server response, not a generated object URL.
 expect(download.url()).toContain('/api/v1/records/archive/exports/');
 // A downloaded snapshot retains its capacity reservation until explicit discard.
 await discardExport(page);
 // Restore under a target-only operator absent from the source archive.
 await authenticate(context,true);
 await exerciseRollback(page,file,sourceSession);
 await page.getByLabel('Archive file',{exact:true}).setInputFiles(file);
 await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Start restore',exact:true}).click();
 await expect(page.locator('[data-archive-state=complete]')).toBeVisible({timeout:90_000});
 await expect(page.getByRole('button',{name:'Start restore',exact:true})).toHaveCount(0);
 const denied=await page.request.get('/api/v1/records/contact');expect(denied.status()).toBe(401);
 await authenticate(context);await openTools(page);
 const restoredSettings=await(await page.request.get('/api/v1/settings')).json();expect(restoredSettings.operators.find(operator=>operator.email==='target-owner@example.test')?.status).toBe('active');expect(restoredSettings.operators.find(operator=>operator.email==='archive-owner@example.test')?.setup_owner).toBe(1);expect(restoredSettings.operators.some(operator=>operator.email==='rollback-guest@example.test')).toBe(false);
 await page.getByLabel('Export transfer ID').fill('');await page.getByRole('button',{name:'Prepare export',exact:true}).click();
 await expect(page.getByRole('link',{name:'Download completed archive'})).toBeVisible({timeout:90_000});
 await expect(page.locator('.workspace-archive__panel').first()).toHaveCSS('border-top-style','solid');
 await page.locator('.workspace-archive').screenshot({path:testInfo.outputPath('orbit-archive-desktop.png')});
 const secondPromise=page.waitForEvent('download');await page.getByRole('link',{name:'Download completed archive'}).click();const second=await secondPromise;
 const {readArchiveFile}=await import('../../src/core/shared/archive-file.ts');
 async function records(path){const result=[];for await(const entry of readArchiveFile(Readable.toWeb(createReadStream(path))))if(entry.kind==='part')for(const record of entry.part.records)if(!['audit_entries','operators','original_operator_provisions','access_memberships'].includes(record.table))result.push(record);return result;}
 expect(await records(await second.path())).toEqual(await records(file));
 await discardExport(page);
});
