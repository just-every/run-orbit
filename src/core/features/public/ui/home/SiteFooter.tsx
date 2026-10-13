import { Link } from "@tanstack/react-router";

import { OrbitLockup } from "../brand/OrbitMark";
import { siteLinks } from "../brand/links";

/** The footer every public page shares. The Run Edit Run credit shows only when the buyer turns it on in ext/config.ts. */
export function SiteFooter({ name, imageUrl, showCredit }: { name: string; imageUrl: string | null; showCredit: boolean }) {
  return (
    <footer className="ob-footer">
      <OrbitLockup name={name} imageUrl={imageUrl} />
      <nav aria-label="Footer">
        <Link to="/docs">Docs</Link>
        <a href={siteLinks.source}>Source</a>
        <a href="/signin">Sign in</a>
        <a className="ob-footer-licence" href={siteLinks.licence}>MIT licence</a>
      </nav>
      {showCredit ? <p className="ob-footer-credit">Powered by <a href="https://runeditrun.com">{name}<span>{" · "}</span>runeditrun.com</a></p> : null}
    </footer>
  );
}
