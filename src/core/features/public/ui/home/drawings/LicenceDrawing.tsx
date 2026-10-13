const LABEL = "Drawing of Orbit's LICENSE file, the MIT License: permission is hereby granted, free of charge, to any person obtaining a copy of this software, to use, copy, modify, merge, publish and distribute it.";

/** The real LICENSE file as a paper card in front of a tangerine disc; the rights it grants are the line in tangerine. */
export function LicenceDrawing() {
  return (
    <figure className="ob-figure ob-figure--licence" role="img" aria-label={LABEL}>
      <span className="ob-disc" aria-hidden="true" />
      <div className="ob-card ob-sheet ob-licence">
        <p className="ob-licence-title">MIT License</p>
        <div className="ob-licence-text">
          <p>Permission is hereby granted, free of charge,</p>
          <p>to any person obtaining a copy of this software</p>
          <p className="ob-licence-rights">to use, copy, modify, merge, publish, distribute</p>
        </div>
        <p className="ob-licence-file"><DocGlyph />LICENSE</p>
      </div>
    </figure>
  );
}

function DocGlyph() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M4 1.75h5.5L12.25 4.5v9.75H4z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M6.25 8h3.5M6.25 10.75h3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
