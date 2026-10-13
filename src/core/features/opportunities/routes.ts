import { Hono } from "hono";
import { z } from "zod";

import { OpportunitiesService } from "./service";

const opportunityIdSchema = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
const nowQuerySchema = z.object({
  band: z.enum(["low", "medium", "high"]).optional(),
  ownerId: z.union([opportunityIdSchema, z.literal("unassigned")]).optional(),
  stageId: opportunityIdSchema.optional()
});

export function createOpportunityRoutes(service: OpportunitiesService) {
  const routes = new Hono();

  routes.get("/now", async (context) => {
    const query = nowQuerySchema.safeParse(context.req.query());
    if (!query.success) return context.json({ error: "Invalid NOW filter." }, 400);

    return context.json(await service.listNowView(query.data));
  });
  routes.get("/:id", async (context) => {
    const id = opportunityIdSchema.safeParse(context.req.param("id"));
    if (!id.success) return context.json({ error: "Invalid opportunity ID." }, 400);

    const opportunity = await service.findDetail(id.data);
    return opportunity
      ? context.json({ opportunity })
      : context.json({ error: "Opportunity not found." }, 404);
  });

  return routes;
}
