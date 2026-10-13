import { HydrationUnit } from '../../../../base/hydration/unit';
import { DocsNavList } from './DocsNavList';
import type { DocsSection } from './types';

/** The section navigation beside the page, from 861px. */
export function DocsSidebar({ sections }: { sections: DocsSection[] }) {
  return <HydrationUnit><nav className="docs-sidebar" aria-label="Documentation">
    <DocsNavList sections={sections} idPrefix="docs-sidebar" />
  </nav></HydrationUnit>;
}
