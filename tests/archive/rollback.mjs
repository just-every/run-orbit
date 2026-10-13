import {expect} from '@playwright/test';
import {createReadStream} from 'node:fs';
import {Readable} from 'node:stream';
import {browserAPI} from '../rer/browser-api.mjs';
import {readArchiveFile} from '../../src/core/shared/archive-file.ts';

/** Exercise the dialog against real staged uploads, refusals and applied restore batches. */
export async function exerciseRollback(page,file,otherSession){
 const api=(path,method='GET',body)=>browserAPI(page,path,method,body),base='/api/v1/records/archive/imports';
 const unrelated=await api('/api/v1/records/company','POST',{name:'Unrelated target customer',primary_domain:'unrelated-target.example'});
 const before=await api(`/api/v1/records/company/${unrelated.id}`);
 await page.getByLabel('Archive file',{exact:true}).setInputFiles(file);await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Start restore',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('HTTP 409');
 const refusedId=await page.getByLabel('Restore transfer ID').inputValue();
 expect((await api(`${base}/${refusedId}`)).state).toBe('uploading');expect(await api(`/api/v1/records/company/${unrelated.id}`)).toEqual(before);
 const aborts=[];const recordAbort=request=>{if(request.method()==='POST'&&new URL(request.url()).pathname.endsWith('/abort'))aborts.push(request.url());};page.on('request',recordAbort);
 try{
  await page.getByRole('button',{name:'Cancel and roll back',exact:true}).click();let dialog=page.getByRole('dialog',{name:'Cancel and roll back',exact:true});await expect(dialog.getByRole('button',{name:'Cancel',exact:true})).toBeFocused();await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
  expect(aborts.length).toBe(0);expect((await api(`${base}/${refusedId}`)).state).toBe('uploading');
  const denied=await page.request.post(`${base}/${refusedId}/abort`,{headers:{Cookie:`${otherSession.cookieName}=${otherSession.token}`,Origin:new URL(page.url()).origin},data:{}});expect(denied.status()).toBe(404);expect((await api(`${base}/${refusedId}`)).state).toBe('uploading');
  await page.getByRole('button',{name:'Cancel and roll back',exact:true}).click();dialog=page.getByRole('dialog',{name:'Cancel and roll back',exact:true});await dialog.getByRole('button',{name:'Cancel and roll back',exact:true}).click();
  await expect(page.getByRole('button',{name:'Cancel and roll back',exact:true})).toHaveCount(0);expect((await api(`${base}/${refusedId}`)).state).toBe('aborted');expect(await api(`/api/v1/records/company/${unrelated.id}`)).toEqual(before);
 }finally{page.off('request',recordAbort);}
 await api(`/api/v1/records/company/${unrelated.id}`,'DELETE',{confirmed:true});
 // The restore requires an empty customer database; target settings, stages and authority are still backed up and restored.
 const initial=await api('/api/v1/settings'),w=initial.workspace;
 await api('/api/v1/settings','PUT',{name:'Target settings retained by rollback',timezone:w.timezone,currency:w.currency,workingHours:{days:[1,2,3,4,5],start:'09:00',end:'17:00'},staleIntervalDays:w.stale_interval_days,awaitingResponseWorkingDays:w.awaiting_response_working_days,freeMailDomains:JSON.parse(w.free_mail_domains_json)});
 await api('/api/v1/settings/stages','PUT',{stages:[...initial.stages.map(({id,name})=>({id,name})),{name:'Target-only stage'}]});
 const workspaces=await api('/api/v2/access/workspaces'),workspace=workspaces[0].workspaceId;
 await api(`/api/v2/access/workspaces/${workspace}/invitations`,'POST',{email:'rollback-guest@example.test',role:'guest',expiresAt:new Date(Date.now()+86400000).toISOString()});
 const targetSettings=await api('/api/v1/settings'),targetAuthority=await api(`/api/v2/access/workspaces/${workspace}/administration`);
 let stage;
 for await(const entry of readArchiveFile(Readable.toWeb(createReadStream(file)))){
  if(entry.kind==='manifest')stage=await api(base,'POST',{confirmed:true,manifest:entry.manifest});
  else stage=await api(`${base}/${stage.id}/parts/${entry.part.index}`,'PUT',entry.part);
 }
 expect(stage?.state).toBe('uploading');const id=stage.id;
 const replacedTable=Math.max(...['workspace_settings','pipeline_stages'].map(name=>stage.manifest.tables.findIndex(table=>table.name===name)));expect(replacedTable).toBeGreaterThanOrEqual(0);
 // Every advance reaches the actual Worker; stop after target rows have been cleared and source rows loaded.
 while(stage.state!=='complete'&&!(stage.phase==='load'&&stage.completedTables>replacedTable))stage=await api(`${base}/${id}/finalize`,'POST',{});
 expect(stage.state).toBe('restoring');expect(stage.phase).toBe('load');
 const protectedRead=await page.request.get('/api/v1/settings');expect(protectedRead.status()).toBe(503);
 await page.getByRole('button',{name:'Find unfinished restores',exact:true}).click();await page.getByRole('button',{name:`Use restore ${id}`,exact:true}).click();
 await page.getByRole('button',{name:'Cancel and roll back',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Cancel and roll back',exact:true});await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);expect((await api(`${base}/${id}`)).state).toBe('restoring');
 await page.getByRole('button',{name:'Cancel and roll back',exact:true}).click();await dialog.getByRole('button',{name:'Cancel and roll back',exact:true}).click();await expect(page.getByRole('button',{name:'Cancel and roll back',exact:true})).toHaveCount(0,{timeout:90_000});
 expect((await api(`${base}/${id}`)).state).toBe('aborted');expect(await api('/api/v1/settings')).toEqual(targetSettings);expect(await api(`/api/v2/access/workspaces/${workspace}/administration`)).toEqual(targetAuthority);
 expect((await api('/api/v1/records/company')).records).toEqual([]);
 // The existing successful-restore journey continues with this still-valid target session.
 await page.getByLabel('Restore transfer ID').fill('');
}
