import { DocsLink } from './DocsLink';
import type { DocsSection } from './types';

/**
 * The sections and their pages. Static navigation marks the rendered page; installed navigation follows the router's
 * location. `idPrefix` keeps the sidebar's and the menu's ids apart.
 */
export function DocsNavList({ sections, idPrefix, currentSlug }: { sections: DocsSection[]; idPrefix: string; currentSlug: string }) {
  return <>
    {sections.map((section, index) => <div className="docs-nav-group" key={section.title}>
      <p className="docs-nav-section" id={`${idPrefix}-${index}`}>{section.title}</p>
      <ul aria-labelledby={`${idPrefix}-${index}`}>
        {section.pages.map(page => <li key={page.href}>
          <DocsLink slug={page.slug} current={page.slug === currentSlug}>{page.label}</DocsLink>
        </li>)}
      </ul>
    </div>)}
  </>;
}
