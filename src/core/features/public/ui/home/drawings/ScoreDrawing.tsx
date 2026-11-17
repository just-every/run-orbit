const LABEL = "Drawing of Orbit's deal page for Northwind renewal, scored 86, High. Signals used by the current score: Customer reply added 40, Meeting booked added 36 and Form submitted added 10.";

const signals = [
  { type: "Customer reply", added: 40 },
  { type: "Meeting booked", added: 36 },
  { type: "Form submitted", added: 10 }
];

/** The opportunity page's evidence section (opportunity-page.tsx): the score and the signed contribution of each signal.
 * The sample adds up: 40 + 36 + 10 = 86, the older signals decayed by the real 30-day policy. */
export function ScoreDrawing() {
  return (
    <figure className="ob-figure ob-figure--score" role="img" aria-label={LABEL}>
      <div className="ob-card ob-sheet ob-score">
        <div className="ob-score-head">
          <strong>Northwind renewal</strong>
          <span className="ob-score-total">86 · High</span>
        </div>
        <p className="ob-sheet-eyebrow">Contributing evidence</p>
        <p className="ob-sheet-title">Signals used by the current score</p>
        <ul className="ob-score-rows">
          {signals.map((signal) => <li key={signal.type}><span>{signal.type}</span><b>+{signal.added}</b></li>)}
        </ul>
      </div>
    </figure>
  );
}
