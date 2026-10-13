import { expect, test } from "@playwright/test";

import { contract } from "../contract.mjs";

const viewports = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 390, height: 844 }
];

function watchPageFailures(page) {
  const failures = [];
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
  page.on("requestfailed", (request) => failures.push(`requestfailed: ${request.url()}`));
  return failures;
}

async function expectNoHorizontalOverflow(page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test("the Worker health endpoint proves its D1 schema is reachable", async ({ request }) => {
  const response = await request.get("/health");

  expect(response.status()).toBe(200);
  await expect(response).toBeOK();
  await expect(response.json()).resolves.toMatchObject({ ok: true, service: "orbit", status: "ok", database: "ok", deployment: expect.any(Object) });
});

for (const viewport of viewports) {
  contract("PUBLIC-001", `the identity plate is sessionless and usable at ${viewport.name} size`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const failures = watchPageFailures(page);
    const response = await page.goto("/", { waitUntil: "networkidle" });

    expect(response?.status()).toBe(200);
    await expect(page.getByTestId("identity-plate")).toBeVisible();
    await expect(page.getByRole("link", { name: "Orbit home" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByTestId("identity-description")).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" }).first()).toHaveAttribute("href", "/signin");
    await expect(page.getByRole("img", { name: /NOW queue/ })).toBeVisible();
    await expect(page.getByText("Pricing", { exact: true })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    expect(failures).toEqual([]);
  });


}

contract("DOCS-001", "the landing's Docs link opens the site's own docs, and their navigation reaches every page", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const failures = watchPageFailures(page);
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("navigation", { name: "Site" }).getByRole("link", { name: "Docs" }).click();
  await expect(page).toHaveURL(/\/docs$/);
  await expect(page.getByRole("heading", { level: 1, name: "Orbit" })).toBeVisible();
  const sidebar = page.locator(".docs-sidebar");
  const links = await sidebar.getByRole("link").evaluateAll((items) => items.map((item) => item.getAttribute("href")));
  expect(links.length).toBeGreaterThan(1);
  for (const href of links) expect((await page.request.get(href)).status(), href).toBe(200);
  await sidebar.getByRole("link").nth(2).click();
  await expect(page.locator(".docs-sidebar [aria-current=page]")).toHaveAttribute("href", links[2]);
  expect((await page.request.get("/docs/not-a-page")).status()).toBe(404);
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page);
  expect(failures).toEqual([]);
});

contract("PUBLIC-003", "sign-in honestly reports unconfigured mail delivery", async ({ page }) => {
  const failures = watchPageFailures(page);
  await page.goto("/signin", { waitUntil: "networkidle" });

  await expect(page.getByRole("alert")).toContainText(/email is not available/i);
  await expect(page.getByRole("textbox")).toHaveCount(0);
  expect(failures).toEqual([]);
});

test("the operator route stays server-gated until magic-link authentication exists", async ({ request }) => {
  const response = await request.get("/app", { maxRedirects: 0 });

  expect(response.status()).toBe(302);
  expect(response.headers().location).toBe("/signin?returnTo=%2Fapp");
});

test("retired public product routes are not served", async ({ request }) => {
  for (const path of ["/pricing/", "/review/", "/sent/"]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
});
