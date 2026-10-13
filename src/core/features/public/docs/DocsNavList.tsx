import { DocsLink } from './DocsLink';
import type { DocsSection } from './types';

/**
 * The sections and their pages. The router marks the current page (aria-current) from the location, so the mark moves the
 * moment a link is followed rather than when the next page's content arrives. `idPrefix` keeps the sidebar's and the menu's ids apart.
 */
export function DocsNavList({ sections, idPrefix }: { sections: DocsSection[]; idPrefix: string }) {
  return <>
    {sections.map((section, index) => <div className="docs-nav-group" key={section.title}>
      <p className="docs-nav-section" id={`${idPrefix}-${index}`}>{section.title}</p>
      <ul aria-labelledby={`${idPrefix}-${index}`}>
        {section.pages.map(page => <li key={page.href}>
          <DocsLink slug={page.slug}>{page.label}</DocsLink>
        </li>)}
      </ul>
    </div>)}
  </>;
}
