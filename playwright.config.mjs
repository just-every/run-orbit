import {isolateBrowserTemp} from './tests/support/browser-temp.mjs';
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {mkdtempSync} from 'node:fs'
import {tmpdir} from 'node:os'
isolateBrowserTemp();
process.env.ORBIT_TEST_STATE??=mkdtempSync(path.join(tmpdir(),'orbit-browser-state-'))
import { defineConfig } from '@playwright/test'

const workspaceRoot = path.dirname(fileURLToPath(import.meta.url))
const testPort = Number(process.env.ORBIT_BROWSER_PORT ?? 8722)
process.env.ORBIT_FIXTURE_BROKER = '1'
const baseURL = `http://127.0.0.1:${testPort}`

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  // Fixture sessions share one local D1 process; HTTP concurrency is exercised in core tests.
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  use: {
    baseURL,
    browserName: 'chromium',
    channel: 'chromium',
    headless: true,
    viewport: {
      width: 1440,
      height: 900,
    },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `PORT=${testPort} node scripts/browser-server.mjs`,
    cwd: workspaceRoot,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 90_000,
  },
})
