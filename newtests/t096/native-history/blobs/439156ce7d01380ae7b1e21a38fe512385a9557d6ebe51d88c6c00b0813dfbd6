import { Hono } from "hono";

import { WorkspaceService } from "./service";

export function createWorkspaceRoutes(service: WorkspaceService) {
  const routes = new Hono();

  routes.get("/presentation", async (context) => {
    const presentation = await service.readPresentation();
    return presentation
      ? context.json({ presentation })
      : context.json({ error: "Workspace settings are unavailable." }, 404);
  });

  return routes;
}
