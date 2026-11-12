import {expect} from '@playwright/test';

/** A newcomer can reveal setup instructions beside each credential/configuration door. */
export async function setupGuidance(page,origin){
 await page.setViewportSize({width:1440,height:900});
 const inspect=async surface=>{
  const help=surface.locator('details.setup-help');
  await expect(help).toHaveCount(1);
  await expect(help).not.toHaveAttribute('open','');
  const body=help.locator('.setup-help__body');
  await expect(body).toBeHidden();
  const summary=help.locator('summary');await summary.focus();await page.keyboard.press('Enter');
  await expect(body).toBeVisible();
  expect(await body.locator('ol > li').count()).toBeGreaterThan(0);
  const links=await body.getByRole('link').evaluateAll(nodes=>nodes.map(node=>node.href));
  expect(links.length).toBeGreaterThan(0);
  for(const href of links){const url=new URL(href);expect(url.protocol).toBe('https:');expect(url.username+url.password).toBe('');}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await summary.focus();await page.keyboard.press('Enter');await expect(body).toBeHidden();
 };
 await page.goto(origin+'/app/settings/integrations');
 for(const product of ['slack','mailchimp','twilio']){
  const row=page.locator(`[data-product="${product}"]`),action=row.locator('.integration-row__action');
  await action.click();const panel=page.locator(`#integration-${product}`);
  await expect(panel.locator('input').first()).toBeVisible();
  await inspect(panel);
  await expect(panel.locator('input').first()).toBeVisible();
 }
 await page.goto(origin+'/app/settings/capture/connect/address');
 await inspect(page.locator('main'));
 await page.goto(origin+'/app/settings/workspace');
 await inspect(page.locator('[aria-labelledby="workspace-ai"]'));
}
