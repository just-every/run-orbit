import { HydrationUnit } from '../../../../base/hydration/unit';
import { DocsNavList } from './DocsNavList';
import type { DocsSection } from './types';

/** The section navigation on phones and narrow windows: one pill that opens the full list. */
export function DocsMenu({ sections, label, currentSlug }: { sections: DocsSection[]; label: string; currentSlug: string }) {
  return <HydrationUnit><nav className="docs-menu" aria-label="Documentation">
    <details>
      <summary>Docs menu <span className="docs-menu-current">· {label}</span></summary>
      <div className="docs-menu-list"><DocsNavList sections={sections} idPrefix="docs-menu" currentSlug={currentSlug} /></div>
    </details>
  </nav></HydrationUnit>;
}
