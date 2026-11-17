const LABEL = "Drawing of Orbit's contact import: the CSV's Email and Full name columns mapped to contact email and contact name, then Import mapped rows, with the report: 212 created, 9 updated, 0 failed.";

const mapping = [["Contact email", "Email"], ["Contact name", "Full name"]];

/** The contact import (Settings › Data › Move in) after a run, with its report counts. */
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
        <p className="ob-import-report"><span>Created <b>212</b></span><span>Updated <b>9</b></span><span>Failed <b>0</b></span></p>
      </div>
    </figure>
  );
}
