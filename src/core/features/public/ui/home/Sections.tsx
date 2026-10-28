import { PublicLink as Link, useSiteVariant } from "../site-variant";

import { siteLinks } from "../brand/links";
import { ImportDrawing } from "./drawings/ImportDrawing";
import { LicenceDrawing } from "./drawings/LicenceDrawing";
import { ExportDrawing } from "./drawings/rest/ExportDrawing";
import { FollowUpDrawing } from "./drawings/rest/FollowUpDrawing";
import { FormDrawing } from "./drawings/rest/FormDrawing";
import { RecordsDrawing } from "./drawings/rest/RecordsDrawing";
import { ScoreDrawing } from "./drawings/ScoreDrawing";

/** One pipeline for the whole team, owned and run by you, with the real licence drawn. */
export function Free() {
  const site = useSiteVariant();
  return (
    <section className="ob-section ob-split" id="free" aria-labelledby="ob-free-title">
      <div className="ob-section-copy">
        <h2 id="ob-free-title">One pipeline for the whole team.</h2>
        <p>Everyone works the same deals in one pipeline, on a server you run. Orbit is open source under the MIT licence, so the code and your data are yours to change and keep.</p>
        <ul className="ob-proof" aria-label="What Orbit never charges for">
          <li>No seats.</li><li>No plans.</li><li>No fees.</li>
        </ul>
        <div className="ob-actions"><a className="ob-pill" href={site ? '/run' : siteLinks.source}>{site ? 'Run Orbit' : 'Get the code'}</a></div>
        <p className="ob-footnote">You can also have all the source for free.</p>
      </div>
      <LicenceDrawing />
    </section>
  );
}

/** The second differentiator: a score is customer activity added up, and the deal page shows each part. */
export function Score() {
  return (
    <section className="ob-section ob-split ob-split--reverse" id="score" aria-labelledby="ob-score-title">
      <div className="ob-section-copy">
        <h2 id="ob-score-title">Every score shows its working.</h2>
        <p>A score is what customers did, added up: a reply, a booked meeting, a form. Older activity counts for less. Open any deal to see what each one added.</p>
      </div>
      <ScoreDrawing />
    </section>
  );
}

const features = [
  { id: "records", title: "Customer records", line: "Contacts, companies and deals, with your own fields.", Drawing: RecordsDrawing },
  { id: "form", title: "Your contact form", line: "Each enquiry lands on the right contact.", Drawing: FormDrawing },
  { id: "follow", title: "Replies stop follow-ups", line: "A reply cancels what you scheduled for that person.", Drawing: FollowUpDrawing },
  { id: "export", title: "Export and restore", line: "A complete archive of your workspace, any time.", Drawing: ExportDrawing }
];

/** The rest of the product: four features, each drawn and laid out for what it shows (rest.css, rest-art.css). */
export function Product() {
  return (
    <section className="ob-section" id="product" aria-labelledby="ob-product-title">
      <h2 id="ob-product-title">The rest of your CRM</h2>
      <div className="ob-rest-wrap">
        <div className="ob-rest">
          {features.map(({ id, title, line, Drawing }) => (
            <article className={`ob-feat ob-feat--${id}`} aria-labelledby={`ob-feat-${id}`} key={id}>
              <Drawing />
              <div className="ob-feat-copy">
                <h3 id={`ob-feat-${id}`}>{title}</h3>
                <p>{line}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const tryItSteps = [
  ["Install it.", "Codex or Claude can help."],
  ["Bring your contacts.", "Import a CSV from the tool you use now."],
  ["Invite your team.", "Everyone sees every customer."]
];

/** How a team that is happy with its current CRM tries Orbit beside it. */
export function TryIt() {
  return (
    <section className="ob-section ob-split" id="try-it" aria-labelledby="ob-try-title">
      <div className="ob-section-copy">
        <h2 id="ob-try-title">Try it beside what you have</h2>
        <p>Keep your current CRM running while you try it.</p>
        <ol className="ob-try-steps">
          {tryItSteps.map(([lead, line], index) => <li key={lead}><span aria-hidden="true">{index + 1}</span><p><strong>{lead}</strong> {line}</p></li>)}
        </ol>
        <Link className="ob-link" to="/docs" hash="run-it-on-your-computer">Read the docs</Link>
      </div>
      <ImportDrawing />
    </section>
  );
}

/** The closing call to action; the hero's rank returns once beside it. */
export function Closing() {
  const site = useSiteVariant();
  return (
    <section className="ob-section ob-closing" id="get-started" aria-labelledby="ob-closing-title">
      <span className="ob-closing-numeral" aria-hidden="true">01</span>
      <div className="ob-closing-copy">
        <h2 id="ob-closing-title">Ready for the next reply.</h2>
        <div className="ob-actions">
          <a className="ob-pill ob-pill--large" href={site ? '/run' : siteLinks.source}>{site ? 'Run Orbit' : 'Get the code'}</a>
          <Link className="ob-link ob-link--large" to="/docs">Read the docs</Link>
        </div>
      </div>
    </section>
  );
}
