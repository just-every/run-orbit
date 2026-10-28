import { chromium } from '@playwright/test';

// Use this checkout's current bundled headless shell, its default arguments and
// real HOME, exactly as the browser journeys do.
const browser = await chromium.launch({ headless: true, args: ['--use-mock-keychain', '--password-store=basic'] });
try {
  const page = await browser.newPage();
  await page.goto('data:text/html,<title>Chromium launch probe</title>');
  if (await page.title() !== 'Chromium launch probe') throw Error('Chromium did not render the launch probe.');
} finally {
  await browser.close();
}
