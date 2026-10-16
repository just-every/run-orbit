import { PublicVariantProvider, type PublicVariant } from '../ui/site-variant';
import { publicProductConfig } from '../../../app/mounts/public-config';
import { SiteFooter } from '../ui/home/SiteFooter';
import { SiteHeader } from '../ui/home/SiteHeader';
import { DocsArticle } from './DocsArticle';
import { DocsMenu } from './DocsMenu';
import { DocsPager } from './DocsPager';
import { DocsSidebar } from './DocsSidebar';
import { DocsToc } from './DocsToc';
import type { DocsView } from './types';
import './docs.css';

/** A documentation page in the landing's header and footer: sidebar | page | contents. The page title is the one h1. */
export function DocsPage({ page, sections, repository, signedIn = false, variant = 'installed' }: DocsView & { variant?: PublicVariant }) {
  const { name, imageUrl, showPoweredByCredit } = publicProductConfig;
  const order = sections.flatMap(section => section.pages.map(entry => ({ ...entry, section: section.title })));
  const index = order.findIndex(entry => entry.slug === page.slug);
  const current = order[index];
  return <PublicVariantProvider variant={variant}><div className="ob-site ob-docs">
    <a className="ob-skip" href="#docs-content">Skip to the page</a>
    <SiteHeader name={name} imageUrl={imageUrl} current="docs" signedIn={signedIn} />
    <div className="docs-shell">
      <DocsSidebar sections={sections} />
      <main id="docs-content" tabIndex={-1} className="docs-main">
        <DocsMenu sections={sections} label={current.label} />
        <DocsArticle page={page} section={current.section} />
        <DocsPager previous={order[index - 1]} next={order[index + 1]} editUrl={`${repository.url}/edit/${repository.branch}/${page.source}`} />
      </main>
      <DocsToc toc={page.toc} />
    </div>
    <SiteFooter name={name} imageUrl={imageUrl} showCredit={showPoweredByCredit} />
  </div></PublicVariantProvider>;
}
