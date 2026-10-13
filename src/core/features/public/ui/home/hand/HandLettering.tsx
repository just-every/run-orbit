import { ADVANCE, LINE_DRIFT, LINE_HEIGHT, glyphs } from "./glyphs";

/** Capitals lettered by hand as strokes in an inline SVG, so no font is fetched. The drawing is decorative, so it is hidden
 * from assistive technology; its natural width in glyph units is exposed as --w so a stylesheet can size it. */
export function HandLettering({ lines, className }: { lines: readonly string[]; className?: string }) {
  const width = Math.ceil(2 + Math.max(...lines.map((line) => line.length)) * ADVANCE + (lines.length - 1) * LINE_DRIFT);
  const height = Math.ceil(0.5 + (lines.length - 1) * LINE_HEIGHT + 10);
  return (
    <svg className={className} viewBox={`0 0 ${width} ${height}`} style={{ "--w": width } as React.CSSProperties} aria-hidden="true" focusable="false">
      <g transform="translate(2 0.5) skewX(-9)">
        {lines.map((line, row) => (
          <g key={line} transform={`translate(${row * LINE_DRIFT} ${row * LINE_HEIGHT})`}>
            {[...line].map((letter, column) => glyphs[letter] && <path key={column} d={glyphs[letter]} transform={`translate(${column * ADVANCE} 0)`} />)}
          </g>
        ))}
      </g>
    </svg>
  );
}
