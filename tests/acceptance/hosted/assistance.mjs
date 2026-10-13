import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export async function assistance({page,origin,api,opportunityId}) {
 const contactInventory=page.waitForResponse(response=>response.url()===`${origin}/api/v1/opportunities/${opportunityId}`);
 await page.goto(`${origin}/app/assistance/${opportunityId}`,{waitUntil:'domcontentloaded'});
 assert.equal((await contactInventory).status(),200);
 const prepared=page.waitForResponse(response=>response.url().endsWith('/assistance/preview'));
 await page.getByRole('button',{name:'Preview request',exact:true}).click();const previewResponse=await prepared;assert.equal(previewResponse.status(),200);const preview=await previewResponse.json();assert.equal(preview.configured,true);
 await page.getByText('View complete request',{exact:true}).click();
 await page.getByText(JSON.stringify(preview.preview,null,2),{exact:true}).waitFor();await page.screenshot({path:'verification/hosted-ai-preview.png',fullPage:true});
 const generated=page.waitForResponse(response=>response.url().endsWith('/assistance/generate'));
 await page.getByRole('button',{name:'Generate draft',exact:true}).click();const generatedResponse=await generated;assert.equal(generatedResponse.status(),200);const result=await generatedResponse.json();assert.ok(result.draftId);assert.ok(result.output.evidenceIds.every(id=>preview.preview.evidence.some(e=>e.id===id)));assert.ok(result.output.body.trim().split(/\s+/).length<=150);
 await page.getByRole('link',{name:'Review saved draft',exact:true}).click();await page.getByTestId('draft-body').waitFor();assert.equal(await page.getByTestId('draft-body').inputValue(),result.output.body);assert.equal((await api(`workbench/opportunities/${opportunityId}/messages`)).messages.length,0);
 return{provider:preview.provider,model:preview.model,previewSha256:createHash('sha256').update(JSON.stringify(preview.preview)).digest('hex'),draftId:result.draftId,draftSha256:createHash('sha256').update(result.output.body).digest('hex'),nativeReviewedPreview:true,evidenceValidated:true,wordLimitValidated:true,durableUnsentDraft:true};
}
