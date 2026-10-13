import { createContext, useContext, type AnchorHTMLAttributes, type PropsWithChildren } from 'react';
import { Link } from '@tanstack/react-router';

export type PublicVariant = 'installed' | 'site';
const Variant = createContext<PublicVariant>('installed');
export const useSiteVariant = () => useContext(Variant) === 'site';
export function PublicVariantProvider({ variant, children }: PropsWithChildren<{ variant: PublicVariant }>) {
  return <Variant.Provider value={variant}>{children}</Variant.Provider>;
}

/** Static pages have no router; the installed Lobby always requires document navigation. */
export function PublicLink({ to, hash, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: '/' | '/docs'; hash?: string }) {
  const site = useSiteVariant();
  return site || to === '/'
    ? <a href={to + (hash ? `#${hash}` : '')} {...props}>{children}</a>
    : <Link to={to} hash={hash} {...props}>{children}</Link>;
}
