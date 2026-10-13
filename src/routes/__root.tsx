import { introGuardScript, introCss } from '../base/hydration/intro-guard';
import { editorLeaf } from "../editor/leaf";
import { fontLinks } from "../core/app/font-head";
import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import styles from "../core/app/styles.css?url";
import { NotFoundPage } from "../core/features/public/ui/not-found-page";
export const Route = createRootRoute({
  head: () => ({ meta: [{ charSet: "utf-8" }, { name: "viewport", content: "width=device-width, initial-scale=1" }, { title: "Orbit" }], links: [...fontLinks, { rel: "stylesheet", href: styles }, { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" }] }),
  // Keep DOM paths stable when native navigation replaces the destination leaf.
  component: () => <html lang="en"><head><script dangerouslySetInnerHTML={{ __html: introGuardScript }} /><style>{introCss}</style><HeadContent /></head><body><div id="orbit-root" style={{ display: "contents" }}><Outlet /></div><Scripts /></body></html>,
  notFoundComponent: editorLeaf(NotFoundPage)
});
