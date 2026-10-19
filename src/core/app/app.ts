import {createSalesTaskRoutes} from '../features/tasks';
import {createRelationshipRoutes} from '../features/relationships';
import type {ProviderFetch} from '../features/capture/providers/config';
import { createImportRoutes } from '../features/imports/routes';
import {createCaptureRoutes} from '../features/capture/routes';
import {createForwardInboundRoutes} from '../features/capture/forward/inbound';
import {AccessError} from '../features/access/errors';
import {createFoldRoutes} from './mounts/fold';
import {createPublicFormRoutes} from '../features/forms/public-routes';
import type {FormAbuseOptions} from '../features/forms/abuse';
import {FormService} from '../features/forms/service';
import {collaboratorNativeBoundary} from '../features/access/native-boundary';
import {delegationRoutes} from '../features/delegation/routes';
import {nativeDelegationRoutes} from '../features/delegation/native';
import { boundedRequestBody, RequestBodyTooLarge } from "../platform/bounded-request-body";
import {archiveImportActive,archiveMaintenanceMessage} from '../platform/archive-maintenance';
import {processEvaluationJobs} from "../features/workbench/evaluation-repository";
import {createMailEventRoutes} from "../features/outreach/provider-routes";
import {createRecordsRoutes} from "../features/records/routes";
import {createSettingsRoutes} from "../features/settings/routes";
import { createSetupRoutes } from "../features/setup/routes";
import {createSignalIngress,createSourceRoutes} from "../features/ingestion/routes";
import type {SourceSecurity} from "../platform/source-security";
import type { CustomerMailStatus, OutboundMail } from "../platform/outbound-mail";
import { createWorkbenchRoutes } from "../features/workbench/routes";
import { Hono, type MiddlewareHandler } from "hono";
import {runRequestTimers} from '../features/outreach/scheduler';

import { createDraftRoutes } from "../features/drafts";
import type { AuthenticatedOperator } from "../features/identity";
import type { StepUpAction } from "@runeditrun/rer/modules/operator-auth";
import type { AssetStore } from "../platform/assets";
import { createDependencies } from "./dependencies";

import { createNotificationRoutes } from "../features/notifications/routes";
import { createPublicDemoRoutes } from "../features/public/routes";
import { createAssistanceRoutes } from "../features/assistance/routes";
import { createTodayRoutes } from "../features/today/routes";
import type { AIProvider } from "../features/assistance/provider";

type AppEnvironment = {
  Variables: { operator: AuthenticatedOperator };
};

export function createApp(input: { assets: AssetStore; database: D1Database; authenticate: (request: Request) => Promise<AuthenticatedOperator | undefined>; stepUp: (request: Request, action: StepUpAction, returnTo?: string) => Promise<Response | null>; outboundMail?: OutboundMail; mailSettings?: CustomerMailStatus; hosted?:boolean; aiProvider?: AIProvider; sourceSecurity?: SourceSecurity; captureOrigin?:string; captureFetch?:ProviderFetch; formAbuse?:FormAbuseOptions; captureMailAddress?:string; mailEventKeys?: {eventKey?:string;parseKey?:string;relaySecret?:string}; publicDemoEnabled?: boolean; deployment?: { sourceSha?: string; fingerprint?: string; versionId?: string } }) {
  const app = new Hono<AppEnvironment>();
  const dependencies = createDependencies(input.database);
  const requireApiOperator: MiddlewareHandler<AppEnvironment> = async (context, next) => {
    const operator = await input.authenticate(context.req.raw);
    if (!operator) return context.json({ error: "Operator session required." }, 401);
    context.set("operator", operator);
    await next();
  };

  app.get("/health", async (context) => {
    try {
      const health = await dependencies.health.check();
      return context.json({ ok: true, service: "orbit", status: "ok", ...health, ...(input.deployment ? { deployment: input.deployment } : {}) });
    } catch {
      return context.json({ service: "orbit", status: "unavailable", database: "unavailable" }, 503);
    }
  });

  app.use('*',async(context,next)=>{
    const path=context.req.path;
    if((path.startsWith('/api/v1/signals/')||path.startsWith('/api/v1/mail/events/')||path==='/api/v1/mail/capture'||path.startsWith('/api/v1/public-demo')||path.startsWith('/api/public/forms/')||path.startsWith('/p/'))&&await archiveImportActive(input.database))return context.json({error:archiveMaintenanceMessage},503,{'Retry-After':'30'});
    await next();
  });
  app.get('/p/:slug',async c=>{try{return c.html(await new FormService(input.database).publicDocument(c.req.param('slug')),200,{'Cache-Control':'no-store'});}catch(error){return error instanceof AccessError&&error.code==='permission'?c.text('This page is not published.',404):c.text('This page could not be verified. Try again later.',503);}});
  app.route('/api/public/forms',createPublicFormRoutes(input.database,input.formAbuse));
  app.route("/api/v1/public-demo", createPublicDemoRoutes(input.publicDemoEnabled !== false));
  app.route("/api/v1/mail/events", createMailEventRoutes(input.database,input.mailEventKeys??{}));
  app.route('/api/v1/mail/capture',createForwardInboundRoutes(input.database,{security:input.sourceSecurity,address:input.captureMailAddress,parseKey:input.mailEventKeys?.parseKey}));
  app.route("/api/v1/signals", createSignalIngress(input.database,input.sourceSecurity));
  app.route("/api/delegation/v1", delegationRoutes(input.database));
  app.route("/delegation", nativeDelegationRoutes(input.database,input.authenticate,input.stepUp));
  app.use("/api/*", requireApiOperator);
  app.use('/api/*',async(context,next)=>{if(!context.req.path.startsWith('/api/v1/records/archive')&&await archiveImportActive(input.database))return context.json({error:archiveMaintenanceMessage},503,{'Retry-After':'30'});await next();});
  app.use("/api/*", async (context,next) => {
    context.header("Cache-Control", "no-store");
    if (!["GET","HEAD","OPTIONS"].includes(context.req.method) && context.req.header("Origin") !== new URL(context.req.url).origin) return context.json({error:"Request origin is not allowed."},403);
    await next();
  });
  app.use('/api/v1/*',async(context,next)=>{
    await next();
    if(input.hosted&&context.req.method==='GET'&&context.res.status<400)
      context.executionCtx.waitUntil(runRequestTimers(input.database,input.outboundMail));
  });
  app.use("/api/*", async (context,next) => {
    if ((context.req.path.startsWith("/api/v1/records/archive/") || context.req.path.startsWith("/api/v1/imports/") || context.req.path.startsWith("/api/v1/capture/")) && !["GET","HEAD","OPTIONS"].includes(context.req.method)) {
      try {
        const body = await boundedRequestBody(context.req.raw, 16 * 1024 * 1024);
        context.req.raw = new Request(context.req.raw, { body });
      } catch (error) {
        if (error instanceof RequestBodyTooLarge) return context.json({error:context.req.path.startsWith("/api/v1/capture/")?"Captured files exceed 16 MiB; add fewer at a time.":"Archive request exceeds 16 MiB."},413);
        return context.json({error:"Archive request body could not be read."},400);
      }
    } else if (!["GET","HEAD","OPTIONS"].includes(context.req.method) && context.req.header("Content-Type")?.includes("application/json")) {
      // Read once and hand routes a fresh Request: under Node, collecting a clone cancels the original's body.
      const body = await context.req.raw.text();
      try { JSON.parse(body); } catch { return context.json({error:"Request body must be valid JSON."},400); }
      context.req.raw = new Request(context.req.raw, { body });
    }
    await next();
  });
  // Base step-up: exporting all data, replacing it from an archive and permanently erasing an operator need a fresh app-local email proof.
  const stepUps: [RegExp, StepUpAction, string][] = [[/^\/api\/v1\/records\/archive\/exports$/, 'export', '/app/records'], [/^\/api\/v1\/records\/archive\/imports$/, 'delete', '/app/records'], [/^\/api\/v1\/settings\/operators\/[^/]+\/erase$/, 'delete', '/app/settings']];
  app.use("/api/*", async (context, next) => {
    const guarded = context.req.method === "POST" ? stepUps.find(([path]) => path.test(context.req.path)) : undefined;
    if (guarded) { const refused = await input.stepUp(context.req.raw, guarded[1], guarded[2]); if (refused) return refused; }
    await next();
  });
  app.route('/api/v2',createFoldRoutes(input.database));
  app.use('/api/v1/*',collaboratorNativeBoundary(input.database));
  app.use("/api/v1/records/*", async (context,next) => {
    await next();
    if (!context.req.path.startsWith("/api/v1/records/archive") && !["GET","HEAD","OPTIONS"].includes(context.req.method) && context.res.status<400) {
      try { await processEvaluationJobs(input.database); } catch { context.header("X-Orbit-Evaluation","failed; inspect stale evaluation"); }
    }
  });
  app.use("/api/v1/capture/*", async (context,next) => {
    await next();
    if (!["GET","HEAD","OPTIONS"].includes(context.req.method) && context.res.status<400) {
      try { await processEvaluationJobs(input.database); } catch { context.header("X-Orbit-Evaluation","failed; inspect stale evaluation"); }
    }
  });
  app.use("/api/v1/settings/*", async (context,next) => {
    await next();
    if (!context.req.path.startsWith("/api/v1/records/archive") && !["GET","HEAD","OPTIONS"].includes(context.req.method) && context.res.status<400) {
      try { await processEvaluationJobs(input.database); } catch { context.header("X-Orbit-Evaluation","failed; inspect stale evaluation"); }
    }
  });
  app.route('/api/v1/imports',createImportRoutes(input.database));
  app.route('/api/v1/capture',createCaptureRoutes(input.database,{security:input.sourceSecurity,origin:input.captureOrigin,fetcher:input.captureFetch,mailAddress:input.captureMailAddress,local:input.hosted===false}));
  app.route("/api/v1/records", createRecordsRoutes(input.database));
  app.route('/api/v1/tasks',createSalesTaskRoutes(input.database));
  app.route('/api/v1/relationships',createRelationshipRoutes(input.database));
  app.route("/api/v1/settings", createSettingsRoutes(input.database,request=>input.stepUp(request,'email:change','/app/settings')));
  app.route("/api/v1/setup", createSetupRoutes(input.database));
  app.route("/api/v1/sources", createSourceRoutes(input.database,input.sourceSecurity));
  app.route("/api/v1/notifications", createNotificationRoutes(input.database));
  app.route("/api/v1/assistance", createAssistanceRoutes(input.database,input.aiProvider));
  app.route("/api/v1/today", createTodayRoutes(input.database,input.aiProvider));
  app.route("/api/v1/workbench", createWorkbenchRoutes(input.database, input.outboundMail,Boolean(input.aiProvider),input.hosted,input.mailEventKeys??{},input.captureOrigin,input.mailSettings));
  app.route("/api/v1/opportunities", dependencies.opportunityRoutes);
  app.route("/api/v1/drafts", createDraftRoutes(dependencies.drafts));
  app.route("/api/v1/workspace", dependencies.workspaceRoutes);

  app.all("*", (context) => context.notFound());

  return app;
}
