import { Link } from "@tanstack/react-router";

import { OrbitLockup } from "../brand/OrbitMark";
import { siteLinks } from "../brand/links";

/** The header every public page shares: the lockup left; Docs, Source and the Sign in pill right. */
export function SiteHeader({ name, imageUrl, current }: { name: string; imageUrl: string | null; current?: "docs" }) {
  return (
    <header className="ob-header">
      <Link aria-label={`${name} home`} to="/"><OrbitLockup name={name} imageUrl={imageUrl} /></Link>
      <nav aria-label="Site">
        <Link to="/docs" aria-current={current === "docs" ? "page" : undefined}>Docs</Link>
        <a href={siteLinks.source}>Source</a>
        {/* Base serves the sign-in page itself, outside the app router: a document navigation. */}
        <a className="ob-pill" href="/signin">Sign in</a>
      </nav>
    </header>
  );
}
