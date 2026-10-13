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
 await expect(page.getByRole('status').filter({hasText:'Restore completed.'})).toBeVisible({timeout:90_000});
 await expect(page.getByRole('button',{name:'Start restore',exact:true})).toHaveCount(0);
 const denied=await page.request.get('/api/v1/records/contact');expect(denied.status()).toBe(401);
 await authenticate(context);await openTools(page);
 await page.getByLabel('Export transfer ID').fill('');await page.getByRole('button',{name:'Prepare export',exact:true}).click();
 await expect(page.getByRole('link',{name:'Download completed archive'})).toBeVisible({timeout:90_000});
 await expect(page.locator('.workspace-archive__panel').first()).toHaveCSS('border-top-style','solid');
 await page.locator('.workspace-archive').screenshot({path:testInfo.outputPath('orbit-archive-desktop.png')});
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator('.workspace-archive').screenshot({path:testInfo.outputPath('orbit-archive-mobile.png')});
 const secondPromise=page.waitForEvent('download');await page.getByRole('link',{name:'Download completed archive'}).click();const second=await secondPromise;
 const {readArchiveFile}=await import('../../src/core/shared/archive-file.ts');
 async function records(path){const result=[];for await(const entry of readArchiveFile(Readable.toWeb(createReadStream(path))))if(entry.kind==='part')for(const record of entry.part.records)if(record.table!=='audit_entries')result.push(record);return result;}
 expect(await records(await second.path())).toEqual(await records(file));
 await discardExport(page);
 // Exercise the actual CLI engine over the same native HTTP API. Only the
 // production HTTPS-only argument gate is bypassed for this local test server.
 const session=await authenticate(context),origin=new URL(page.url()).origin;
 const {runTransfer}=await import('../../scripts/data-transfer/run.mjs');
 const {transferClient}=await import('../../scripts/data-transfer/http.mjs');
 const request=transferClient(origin,`${session.cookieName}=${session.token}`),cliFile=testInfo.outputPath('cli-archive.json');
 await runTransfer({operation:'export',origin,file:cliFile},request,()=>{});
 expect(await records(cliFile)).toEqual(await records(file));
 // Release the real CLI snapshot through the same shipped Records controls.
 await page.getByRole('button',{name:'Find unfinished exports',exact:true}).click();
 await page.getByRole('button',{name:/^Use export /}).click();
 await discardExport(page);
 await runTransfer({operation:'import',origin,file:cliFile},request,()=>{});
 expect((await page.request.get('/api/v1/records/contact')).status()).toBe(401);
});
