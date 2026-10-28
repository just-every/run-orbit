import { useSiteVariant } from '../ui/site-variant';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

type DocsLinkProps = {
  /** The page's slug from docs/site.json ("" is the docs home). */
  slug: string;
  className?: string;
  rel?: string;
  /** The rendered page for static navigation, where there is no router. */
  current?: boolean;
  children: ReactNode;
};

/** A published docs link. Installed navigation follows the router; static navigation uses the rendered page. */
export function DocsLink({ slug, current = false, children, ...props }: DocsLinkProps) {
  if (useSiteVariant()) return <a href={slug ? `/docs/${slug}` : '/docs'} aria-current={current ? 'page' : undefined} {...props}>{children}</a>;
  return slug
    ? <Link to="/docs/$slug" params={{ slug }} activeOptions={{ exact: true }} {...props}>{children}</Link>
    : <Link to="/docs" activeOptions={{ exact: true }} {...props}>{children}</Link>;
}
