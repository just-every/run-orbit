import { withDemo } from '@runeditrun/rer/modules/demo';
import { seedDemo, demoOwner } from '../../demo';
import { staticAssetResponse } from '../../base/static-assets';
import { lobbyResponse } from '../../base/lobby';
import { claimedWhen, setupStateResponse } from '../../base/setup-state';
import { identity as editionIdentity } from '../../identity';
const claimed = claimedWhen("SELECT 1 FROM operators WHERE setup_owner = 1 AND status = 'active'");
import {pollProviders} from '../features/capture/providers/service';
import { editorConfigurationResponse, editorOrigin } from "../features/editor/server";
import {embeddingOrigins} from '../features/forms/embedding';
import {archiveImportActive} from '../platform/archive-maintenance';
import {sweepArchiveTrash} from "../features/records/archive-erasure";
import {protectResponse} from "../platform/response-policy";
import {runHostedTimers} from "../features/outreach/scheduler";
import {publicRateLimit} from "../platform/public-rate-limit";
import {createSourceSecurity} from "../platform/source-security";
import { createAIProvider } from "../features/assistance/provider";
import { firstRunComplete } from "../features/setup/repository";
import { createOutboundMail } from "../platform/outbound-mail";
import start from "@tanstack/react-start/server-entry";
import { createAssetStore, type PlatformBindings } from "../platform/assets";
import { createApp } from "./app";
import { identityResponse, operatorFromRequest, requireStepUp } from "../features/identity";
import { devGate } from "@runeditrun/rer/modules/operator-auth";
import { publicDemoConfig } from "./mounts/public-config.server";
export default withDemo({
  async scheduled(_event:ScheduledController,bindings:PlatformBindings,context:ExecutionContext) {bindings=runtimeBindings(bindings);context.waitUntil(runHostedTimers(bindings.DB,createOutboundMail(bindings)));context.waitUntil(sweepArchiveTrash(bindings.DB));context.waitUntil(pollProviders(bindings.DB,createSourceSecurity(bindings)));},
  async fetch(request: Request, bindings: PlatformBindings, executionContext: ExecutionContext) {return protectResponse(await handle(request,runtimeBindings(bindings),executionContext),editorOrigin(bindings),request.method==='GET'&&/^\/p\/[a-z0-9][a-z0-9-]{0,79}$/.test(new URL(request.url).pathname)?await embeddingOrigins(bindings.DB):undefined);}
}, { seed: seedDemo, owner: demoOwner });
// rer dev and preview may serve a requested loopback origin; the saved local origin is never rewritten.
export function runtimeBindings(bindings: PlatformBindings): PlatformBindings {
  return bindings.AUTH_LOCAL === "true" && bindings.RER_DEV_ORIGIN ? { ...bindings, AUTH_ORIGIN: bindings.RER_DEV_ORIGIN } : bindings;
}
async function handle(request: Request, bindings: PlatformBindings, executionContext: ExecutionContext) {
    const url = new URL(request.url);
    const path = url.pathname;
    const expectedHost = bindings.AUTH_ORIGIN ? new URL(bindings.AUTH_ORIGIN).host : undefined;
    if (expectedHost && url.host !== expectedHost && !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) return new Response("Not found", { status: 404 });
    const asset = await staticAssetResponse(request, bindings);
    if (asset) return asset;
    const publicBindings = { DB: bindings.DB, AUTH_ORIGIN: bindings.AUTH_ORIGIN ?? '' };
    const state = await setupStateResponse(request, publicBindings, claimed);
    if (state) return state;
    const lobby = await lobbyResponse(request, publicBindings, editionIdentity, claimed);
    if (lobby) return lobby;
    if (path === "/api/editor/config") return editorConfigurationResponse(request, bindings);
    // The checkout's dev key gates its key exchange; a deployment has no key.
    const gate = devGate({ key: bindings.RER_DEV_KEY, origin: bindings.AUTH_ORIGIN ?? '', local: bindings.AUTH_LOCAL === "true" });
    const exchange = await gate?.exchange(request);
    if (exchange) return exchange;
    if ((path === "/auth/magic-link" || path === "/auth/confirm") && request.method === "POST" && await archiveImportActive(bindings.DB)) return new Response(JSON.stringify({ error: "Orbit is restoring an archive. Try again shortly." }), { status: 503, headers: { "Content-Type": "application/json", "Retry-After": "30" } });
    const identity = await identityResponse(request, bindings, { waitUntil: promise => executionContext.waitUntil(promise), ownerClaimed: async () => Boolean(await bindings.DB.prepare("SELECT 1 FROM operators WHERE setup_owner=1").first()) });
    if (identity) return identity;
    if ((path === "/demo" || path === "/demo/") && !publicDemoConfig.enabled) return new Response("Not found", { status: 404 });
    try { const limited=await publicRateLimit(bindings.DB,request);if(limited)return limited; } catch {return new Response(JSON.stringify({error:"Database unavailable."}),{status:503,headers:{"Content-Type":"application/json"}});}
    if (path.startsWith("/p/") || path.startsWith("/delegation/") || path === "/health" || path === "/api" || path.startsWith("/api/")) {
      return createApp({ assets: createAssetStore(bindings), database: bindings.DB, authenticate: r => operatorFromRequest(r, bindings), stepUp: (r, action, returnTo) => requireStepUp(r, bindings, action, returnTo), outboundMail: createOutboundMail(bindings), hosted:bindings.AUTH_LOCAL!=="true", aiProvider: createAIProvider(bindings), sourceSecurity: createSourceSecurity(bindings), captureOrigin:bindings.AUTH_ORIGIN, publicDemoEnabled: publicDemoConfig.enabled,  mailEventKeys:{eventKey:bindings.SENDGRID_WEBHOOK_PUBLIC_KEY,parseKey:bindings.SENDGRID_PARSE_PUBLIC_KEY,relaySecret:bindings.RER_MAIL_RELAY_SECRET}, deployment:{sourceSha:bindings.RER_DEPLOY_SOURCE,fingerprint:bindings.RER_DEPLOY_FINGERPRINT,versionId:bindings.RER_VERSION?.id} }).fetch(request, bindings, executionContext);
    }
    const setupPath = path === "/setup" || path === "/setup/";
    if (setupPath || path === "/app" || path.startsWith("/app/")) {
      const operator = await operatorFromRequest(request, bindings);
      if (!operator) return new Response(null, { status: 302, headers: { Location: `/signin?returnTo=${encodeURIComponent(setupPath ? "/setup" : path + url.search)}` } });
      // Unfinished first-run setup lives at /setup; a finished one continues into the app.
      const complete = await firstRunComplete(bindings.DB);
      if (setupPath && complete) return new Response(null, { status: 302, headers: { Location: "/app" } });
      if (!setupPath && !complete) return new Response(null, { status: 302, headers: { Location: "/setup" } });
      if(path!=="/app/records"&&await archiveImportActive(bindings.DB))return new Response(null,{status:302,headers:{Location:"/app/records"}});
    }
    return start.fetch(request);
}
