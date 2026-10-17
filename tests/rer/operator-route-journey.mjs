import {expect} from '@playwright/test';
import {observeOperator} from './operator-observations.mjs';
import {operatorRoutes} from './operator-routes.mjs';
import {expectProvenance,exerciseProvenanceEditing} from './operator-provenance.mjs';

export async function operatorRouteJourney({page,fixture,origin,directory,observations},width){
 const widths=[width];
const cases=operatorRoutes(fixture);
for(const width of widths){
 for(const route of cases){await page.goto(origin+route.path);await route.ready(page);try{await observeOperator(page,route.name,width,directory,observations);}finally{await route.after?.(page);}}
 await fixture.collaborator.setViewportSize({width,height:900});await fixture.collaborator.goto(origin+`/app/shared-records?kind=contact&id=${fixture.contactId}`);await fixture.collaborator.getByRole('region',{name:'Shared record details'}).waitFor();await expect(fixture.collaborator.getByText('Ordinary campaign text',{exact:true})).toBeVisible();await expectProvenance(fixture.collaborator,fixture.provenance);await observeOperator(fixture.collaborator,'collaborator-shared',width,directory,observations);
 await fixture.collaborator.goto(origin+'/app/access');await fixture.collaborator.getByRole('heading',{name:'Your collaborator access'}).waitFor();await expect(fixture.collaborator.getByRole('link',{name:'Connected applications and delegations',exact:true})).toHaveCount(0);await observeOperator(fixture.collaborator,'collaborator-access',width,directory,observations);
}
await exerciseProvenanceEditing(page,origin,fixture);
}
