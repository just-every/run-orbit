import { PublicLink as Link, useSiteVariant } from "../site-variant";

import { alternativeSegments } from "../alternative-line";
import { siteLinks } from "../brand/links";
import { OrbitDrawing } from "./OrbitDrawing";

const steps = ["A customer acts", "Orbit moves the deal to your NOW queue", "You follow up with context"];

/** The first view: the promise, the two actions and the orbit drawing of a customer signal moving a deal to the NOW queue. */
export function Hero({ description }: { description: string }) {
  const site = useSiteVariant();
  return (
    <section className="ob-hero" aria-labelledby="ob-hero-title">
      <div className="ob-hero-grid">
        <div className="ob-hero-copy">
          <h1 id="ob-hero-title">Your next deal finds you.</h1>
          <p className="ob-hero-sub" data-testid="identity-description">{description}</p>
          <p className="ob-alt">{alternativeSegments.map((part, index) => (typeof part === "string" ? part : <strong key={index}>{part.brand}</strong>))}</p>
          <div className="ob-actions">
            <a className="ob-pill ob-pill--large" href={site ? '/run' : siteLinks.source}>{site ? 'Run Orbit' : 'Get the code'}</a>
            <Link className="ob-link ob-link--large" to="/docs">Read the docs</Link>
          </div>
        </div>
        <OrbitDrawing />
        <ol className="ob-steps">
          {steps.map((step, index) => <li key={step}><span aria-hidden="true">{index + 1}</span><p>{step}</p></li>)}
        </ol>
      </div>
    </section>
  );
}
