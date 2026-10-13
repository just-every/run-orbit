import { DocsTocCompact } from './DocsToc';
import type { DocsPageData } from './types';

/** The page's title with the short tangerine rule under it, then its body, rendered from Markdown at build time. */
export function DocsArticle({ page, section }: { page: DocsPageData; section: string }) {
  return <>
    <header className="docs-page-head">
      <p className="docs-eyebrow">{section}</p>
      <h1 id={page.titleId} className="docs-title">{page.title}</h1>
      <span className="docs-rule" aria-hidden="true" />
    </header>
    <DocsTocCompact toc={page.toc} />
    <div className="docs-prose" dangerouslySetInnerHTML={{ __html: page.html }} />
  </>;
}
