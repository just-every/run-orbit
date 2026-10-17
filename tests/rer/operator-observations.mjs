import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import {withPreviewTimers} from '../support/preview-timers.mjs';

export async function observeOperator(page,name,width,directory,observations){
 await page.setViewportSize({width,height:900});
 const violations=(await withPreviewTimers(page,()=>new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze())).violations;
 const geometry=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
 const fonts=await page.evaluate(()=>({body:getComputedStyle(document.body).fontFamily,heading:getComputedStyle(document.querySelector('h1')).fontFamily}));
 let text=await page.locator('body').innerText();
 for(const snippet of await page.locator('[data-recipe]').all())if(await snippet.isVisible())text=text.replace(await snippet.innerText(),'');
 const rawData=/[\[{]\s*"[\w -]+"\s*[:,]/.test(text);
 const observation={name,width,url:new URL(page.url()).pathname,violations:violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)})),geometry,fonts,rawData};
 observations.push(observation);await writeFile(join(directory,'routes.json'),JSON.stringify(observations,null,2));
 await page.screenshot({path:join(directory,`${name}-${width}.png`),fullPage:true});
 assert.deepEqual(observation.violations,[],`${name} at ${width}: WCAG A/AA`);
 assert.ok(geometry.scrollWidth<=geometry.width,`${name} at ${width}: horizontal overflow ${geometry.scrollWidth}`);
 assert.equal(rawData,false,`${name} at ${width}: data is shown as readable fields`);
}
