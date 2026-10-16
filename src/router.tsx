import { setLiveEditsReady } from "./editor/runtime";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { ErrorPage } from "./core/features/public/ui/error-page";
export function getRouter() {
  const router = createRouter({ routeTree, scrollRestoration: true, defaultErrorComponent: ErrorPage });
  router.subscribe('onBeforeNavigate', () => { if (typeof document !== 'undefined') setLiveEditsReady(false); });
  return router;
}
declare module "@tanstack/react-router" { interface Register { router: ReturnType<typeof getRouter>; } }
