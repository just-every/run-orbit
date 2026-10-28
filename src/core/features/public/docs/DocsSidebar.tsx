import { HydrationUnit } from '../../../../base/hydration/unit';
import { siteLinks } from '../ui/brand/links';
import { useSiteVariant } from '../ui/site-variant';
import { DocsNavList } from './DocsNavList';
import type { DocsSection } from './types';

/** The section navigation beside the page, from 861px. The run site adds its contract page after the sections. */
export function DocsSidebar({ sections, currentSlug }: { sections: DocsSection[]; currentSlug: string }) {
  const site = useSiteVariant();
  return <HydrationUnit><nav className="docs-sidebar" aria-label="Documentation">
    <DocsNavList sections={sections} idPrefix="docs-sidebar" currentSlug={currentSlug} />
    {site ? <div className="docs-nav-group"><ul><li><a href={siteLinks.contract}>Contract</a></li></ul></div> : null}
  </nav></HydrationUnit>;
}
