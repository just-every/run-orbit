import { editorLeaf } from "../editor/leaf";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { DocsPage } from "../core/features/public/docs/DocsPage";
import { docsHead } from "../core/features/public/docs/head";
import { loadDocsPage } from "../core/features/public/docs/load";

/** One documentation page, rendered at build time from the Markdown file docs/site.json lists for its slug. */
export const Route = createFileRoute("/docs/$slug")({
  loader: async ({ params }) => {
    const view = await loadDocsPage({ data: params.slug });
    if (view.page.slug !== params.slug) throw redirect({ to: '/docs/$slug', params: { slug: view.page.slug }, replace: true });
    return view;
  },
  head: ({ loaderData }) => docsHead(loaderData?.page),
  component: editorLeaf(DocsArticlePage),
});

function DocsArticlePage() {
  return <DocsPage {...Route.useLoaderData()} />;
}
