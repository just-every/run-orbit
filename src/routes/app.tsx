import { createFileRoute, Outlet } from "@tanstack/react-router";
import { NativeOwnerEditor } from "../core/features/editor/owner-editor";
import { loadNativeEditorOwner } from "../core/features/editor/owner-loader";
import { loadAppAccent, loadWorkspaceTimeZone, requireOperator } from "../core/app/loaders";
import { setWorkspaceTimeZone } from "../core/features/operator/ui/formatters";
export const Route = createFileRoute("/app")({
  beforeLoad: async () => {
    const operator = await requireOperator();
    const [editorOwner, timeZone, accent] = await Promise.all([loadNativeEditorOwner(), loadWorkspaceTimeZone(), loadAppAccent()]);
    return { ...operator, editorOwner, timeZone, accent };
  },
  component: App,
});

function App() {
  const { editorOwner, timeZone, accent } = Route.useRouteContext();
  // Set before the page below renders, on the server and in the browser alike.
  setWorkspaceTimeZone(timeZone);
  return <>{accent ? <style>{`.ob-app{--rer-business-accent:${accent.color};--rer-business-accent-text:${accent.text}}`}</style> : null}{editorOwner ? <NativeOwnerEditor /> : null}<Outlet /></>;
}
