import { editorLeaf } from "../editor/leaf";
import { createFileRoute } from "@tanstack/react-router";
import { NowPage } from "../core/features/operator/ui/now-page";
import { loadNow } from "../core/app/loaders";
export const Route = createFileRoute("/app/")({ loader: () => loadNow(), component: editorLeaf(NowRoute)});

function NowRoute() { return <NowPage initialData={Route.useLoaderData()} />; }
