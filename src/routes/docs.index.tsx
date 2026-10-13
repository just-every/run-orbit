import { editorLeaf } from "../editor/leaf";
import { createFileRoute } from "@tanstack/react-router";
import { DocsPage } from "../core/features/public/docs/DocsPage";
import { docsHead } from "../core/features/public/docs/head";
import { loadDocsPage } from "../core/features/public/docs/load";

/** The docs home: README.md, rendered at build time (docs/site.json lists every page). */
export const Route = createFileRoute("/docs/")({
  loader: () => loadDocsPage({ data: "" }),
  head: ({ loaderData }) => docsHead(loaderData?.page),
  component: editorLeaf(DocsHome),
});

function DocsHome() {
  return <DocsPage {...Route.useLoaderData()} />;
}
