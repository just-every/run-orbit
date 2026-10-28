import { Hono } from "hono";
import { z } from "zod";

import type { AuthenticatedOperator } from "../identity";

import { DraftRevisionConflict, DraftsService } from "./service";

const updateDraftSchema = z.object({
  revision: z.number().int().positive(),
  recipientEmail: z.string().email(),
  subject: z.string().trim().min(1),
  body: z.string().trim().min(1)
});
const draftIdSchema = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
const draftListQuerySchema = z.object({ opportunityId: draftIdSchema });

export function createDraftRoutes(service: DraftsService) {
  const routes = new Hono<{ Variables: { operator: AuthenticatedOperator } }>();

  routes.get("/", async (context) => {
    const query = draftListQuerySchema.safeParse(context.req.query());
    if (!query.success || !await service.hasOpportunity(query.data.opportunityId)) {
      return context.json({ error: "That opportunity does not exist." }, 404);
    }

    return context.json({ drafts: await service.listOpportunityDrafts(query.data.opportunityId) });
  });

  routes.get("/:id", async (context) => {
    const id = draftIdSchema.safeParse(context.req.param("id"));
    if (!id.success) return context.json({ error: "That draft does not exist." }, 404);

    const draft = await service.readDraft(id.data);
    return draft ? context.json({ draft }) : context.json({ error: "That draft does not exist." }, 404);
  });

  routes.put("/:id", async (context) => {
    const id = draftIdSchema.safeParse(context.req.param("id"));
    if (!id.success) return context.json({ error: "Invalid draft ID." }, 400);

    let body: unknown;
    try {
      body = await context.req.json();
    } catch {
      return context.json({ error: "Invalid draft update." }, 400);
    }
    const payload = updateDraftSchema.safeParse(body);
    if (!payload.success) return context.json({ error: "Invalid draft update." }, 400);

    try {
      const draft = await service.updateDraft({
        id: id.data,
        expectedRevision: payload.data.revision,
        recipientEmail: payload.data.recipientEmail,
        subject: payload.data.subject,
        body: payload.data.body,
        actorId: context.get("operator").operatorId
      });
      return context.json({ draft });
    } catch (error) {
      if (error instanceof DraftRevisionConflict) {
        return context.json({ error: error.message }, 409);
      }
      throw error;
    }
  });

  return routes;
}
