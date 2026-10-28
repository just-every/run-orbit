import assert from 'node:assert/strict';
import {expect,type Page} from '@playwright/test';
import {captureOwnership as accessible} from './browser-ownership-capture';
type Call=(path:string,method?:string,data?:unknown)=>Promise<any>;
/** Sales reports and dashboards use the selected record owners in their own controls. */
export async function ownershipSalesBrowser(page:Page,width:number,directory:string,call:Call,v1:Call,contact:string){
 const month=width===1440?'2026-03':'2026-04';
 const unassigned=(await v1(`records/contact?q=${encodeURIComponent(`Quinn Davis ${width}`)}`)).records[0];assert.ok(unassigned);
 for(const id of [contact,unassigned.id])await v1(`records/contact/${id}/entries`,'POST',{kind:'note',text:'Production planning discussion',occurredAt:`${month}-12T12:00:00.000Z`});
 const id=`owner-activities-${width}`,base='/api/v2/workspaces/workspace/operations';
 await call(`${base}/metrics`,'POST',{id,version:1,definition:{kind:'sales',name:`Contact owner activities ${width}`,description:'Recorded activities by the responsible contact owner',measures:['activities'],pipelineIds:[],repIds:[],groupBy:'owner',bucket:'month',recordOwnerType:'contact'}});
 await page.goto('/app/reports');await page.getByRole('combobox',{name:'Sales report',exact:true}).selectOption(`${id}:1`);await page.getByLabel('First month',{exact:true}).fill(month);await page.getByLabel('Last month',{exact:true}).fill(month);
 await page.getByText('Edit filters, grouping and sharing',{exact:true}).click();await expect(page.getByLabel('Group linked records by owner',{exact:true})).toHaveValue('contact');await accessible(page,`ownership-sales-editor-${width}`,directory);
 await page.getByRole('button',{name:'Preview sales report',exact:true}).click();const groups=page.getByRole('region',{name:'Rep activities by contact owner',exact:true});await expect(groups).toContainText('Unassigned');await groups.getByRole('button',{name:/Unassigned: show the records behind it/}).first().click();await expect(page.getByRole('region',{name:/Records behind .*Unassigned/})).toContainText(`Quinn Davis ${width}`);await accessible(page,`ownership-sales-result-${width}`,directory);
 const filters={ownerIds:['unassigned'],pipelineIds:[],from:month,through:month,field:null};
 await call(`/api/v2/workspaces/workspace/dashboards/${id}`,'PUT',{version:0,definition:{name:`Contact ownership ${width}`,filters,tiles:[{id:'activities',source:'report',sourceId:id,version:'live',snapshotId:null,measure:'activities',kind:'number',width:12,height:1,bindings:{}}]}});
 await page.goto(`/app/dashboards/${id}`);const card=page.getByRole('region',{name:'Dashboard filters',exact:true});if(width===390)await card.locator('summary').click();await expect(card.getByLabel('Owner',{exact:true})).toBeVisible();await expect(card.getByLabel('Owner',{exact:true})).toHaveValue('unassigned');await page.getByText('Basis',{exact:true}).click();await expect(page.locator('.dash-basis')).toContainText('Owner filter applied');await accessible(page,`ownership-dashboard-${width}`,directory);
 const computed=await call(`/api/v2/workspaces/workspace/dashboards/${id}/compute`,'POST',filters);const report=computed.tiles[0].report;assert.equal(report.sections[0].totals.find((cell:any)=>cell.key==='total').value,1);assert.ok(Object.values(report.rows).some((row:any)=>row.label.includes(`Quinn Davis ${width}`)));assert.ok(!Object.values(report.rows).some((row:any)=>row.label.includes(`Avery Brooks ${width}`)));
}
