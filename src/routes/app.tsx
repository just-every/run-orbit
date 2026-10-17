import { createFileRoute, Outlet } from "@tanstack/react-router";
import { NativeOwnerEditor } from "../core/features/editor/owner-editor";
import { loadNativeEditorOwner } from "../core/features/editor/owner-loader";
import { loadWorkspaceTimeZone, requireOperator } from "../core/app/loaders";
import { setWorkspaceTimeZone } from "../core/features/operator/ui/formatters";
export const Route = createFileRoute("/app")({
  beforeLoad: async () => {
    const operator = await requireOperator();
    const [editorOwner, timeZone] = await Promise.all([loadNativeEditorOwner(), loadWorkspaceTimeZone()]);
    return { ...operator, editorOwner, timeZone };
  },
  component: App,
});

function App() {
  const { editorOwner, timeZone } = Route.useRouteContext();
  // Set before the page below renders, on the server and in the browser alike.
  setWorkspaceTimeZone(timeZone);
  return <>{editorOwner ? <NativeOwnerEditor /> : null}<Outlet /></>;
}
