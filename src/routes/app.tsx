import { createFileRoute, Outlet } from "@tanstack/react-router";
import { NativeOwnerEditor } from "../core/features/editor/owner-editor";
import { loadNativeEditorOwner } from "../core/features/editor/owner-loader";
import { requireOperator } from "../core/app/loaders";
export const Route = createFileRoute("/app")({
  beforeLoad: async () => ({ ...await requireOperator(), editorOwner: await loadNativeEditorOwner() }),
  component: App,
});

function App() {
  const { editorOwner } = Route.useRouteContext();
  return <>{editorOwner ? <NativeOwnerEditor /> : null}<Outlet /></>;
}
