import { createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
export const requireOperator = createServerFn({ method: "GET" }).handler(async () => {
  const { operatorFromRequest } = await import("../platform/request.server");
  const operator = await operatorFromRequest();
  if (!operator) throw redirect({ href: "/signin?returnTo=%2Fapp", statusCode: 302 });
  return { operator };
});

/** The workspace time zone, so every time in the app reads on one labelled clock. */
export const loadWorkspaceTimeZone = createServerFn({ method: "GET" }).handler(async () => {
  await requireOperator();
  // The signed-in shell also hosts invitation acceptance. Loading its clock
  // must not require a workspace membership that the invitation creates.
  const { env } = await import("cloudflare:workers");
  const { DB } = env as unknown as { DB: D1Database };
  const presentation = await DB.prepare("SELECT timezone FROM workspace_settings WHERE id='workspace'").first<{timezone:string}>();
  return presentation?.timezone ?? null;
});

export const loadNow = createServerFn({ method: "GET" }).handler(async () => {
  await requireOperator();
  const { requestScopedDependencies,archiveRestoring } = await import("../platform/request.server");
  if(await archiveRestoring())throw redirect({href:"/app/settings/data",statusCode:302});
  const deps = await requestScopedDependencies();
  const [queue, presentation] = await Promise.all([deps.opportunities.listNowView({}), deps.workspace.readPresentation()]);
  if (!presentation) throw new Error("Workspace is not configured. Run rer setup.");
  return { ...queue, presentation };
});

/** Business accent stays server-resolved, with native owner overrides winning. */
export const loadAppAccent = createServerFn({ method: "GET" }).handler(async () => {
  await requireOperator();
  const { env } = await import('cloudflare:workers');
  const { businessSetupDefaults } = await import('../features/setup/business');
  const { ink } = await import('../../base/foundation/runtime/theme-frame');
  const { brandColor } = await businessSetupDefaults(env as unknown as import('../platform/assets').PlatformBindings);
  return brandColor ? { color: brandColor, text: ink(brandColor) } : null;
});
