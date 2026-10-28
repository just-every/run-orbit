// Load the document reset before component styles, as the installed page does.
import '../core/app/styles.css';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { pages, problem, repository, sections } from 'virtual:orbit-docs';
import { contractPageHtml } from '../base/contract-page';
import { hostingPageHtml } from '../base/hosting-page';
import { runPageHtml, siteNotFoundHtml, type SiteBuild, type SiteContext } from '../base/run-site';
import { identity } from '../identity';
import { run } from './run';
import { HomePage } from '../core/features/public/ui/home-page';
import { DocsPage } from '../core/features/public/docs/DocsPage';
import { publicProductConfig } from '../core/app/mounts/public-config';
import { alternativeLine } from '../core/features/public/ui/alternative-line';

export async function sitePages({ styles, contract, hosting }: SiteContext): Promise<SiteBuild> {
  if (problem) throw new Error(problem);
  const document = (title: string, description: string, body: ReactElement) => '<!doctype html>' + renderToStaticMarkup(
    <html lang="en"><head><meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title}</title><meta name="description" content={description} /><link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      <link rel="stylesheet" href="/fonts/fonts.css" />
      {styles.map(href => <link key={href} rel="stylesheet" href={href} />)}
    </head><body><div id="orbit-root" style={{ display: 'contents' }}>{body}</div></body></html>);
  const docs = await Promise.all(Object.entries(pages).map(async ([slug, load]) => {
    const { default: page } = await load();
    return { path: slug ? `/docs/${slug}` : '/docs', html: document(slug ? `${page.title} · Orbit docs` : 'Orbit docs', page.description,
      <DocsPage page={page} repository={repository} sections={sections} variant="site" />) };
  }));
  return {
    pages: [
      { path: '/', html: document(`${publicProductConfig.name} — ${identity.tagline}`, `${publicProductConfig.description} ${alternativeLine}.`, <HomePage variant="site" />) },
      { path: '/run', html: runPageHtml(identity, run, contract) },
      { path: '/docs/hosting', html: hostingPageHtml(identity, run, hosting ?? null, contract) },
      ...(contract ? [{ path: '/contract', html: contractPageHtml(identity, run, contract) }] : []),
      ...docs,
      { path: '/404', html: siteNotFoundHtml(identity, run, contract) },
    ],
    assets: ['rer-theme.css', 'brand', 'fonts', 'favicon.svg'],
  };
}
