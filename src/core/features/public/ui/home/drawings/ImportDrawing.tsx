const LABEL = "Drawing of Orbit's contact import: the CSV's Email and Full name columns mapped to email and name, then Import mapped rows, with the report: 212 created, 9 updated, 0 failed.";

const mapping = [["email", "Email"], ["name", "Full name"]];

/** The records page's contact import (records-data-tools.tsx) after a run, with its report's own keys. */
export function ImportDrawing() {
  return (
    <figure className="ob-figure ob-figure--import" role="img" aria-label={LABEL}>
      <span className="ob-disc" aria-hidden="true" />
      <div className="ob-card ob-sheet ob-import">
        <p className="ob-sheet-title">Import contacts</p>
        <p className="ob-sheet-eyebrow">Map CSV columns</p>
        <ul className="ob-import-map">
          {mapping.map(([field, column]) => <li key={field}><span>{field}</span><span aria-hidden="true">←</span><span className="ob-chip">{column}</span></li>)}
        </ul>
        <span className="ob-fake-button">Import mapped rows</span>
        <p className="ob-import-report"><span>"created": <b>212</b></span><span>"updated": <b>9</b></span><span>"failed": <b>0</b></span></p>
      </div>
    </figure>
  );
}
