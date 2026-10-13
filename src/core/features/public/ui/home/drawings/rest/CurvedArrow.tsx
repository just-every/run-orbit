type Point = [number, number];

/** A small hand-drawn arrow: one quadratic curve and a small solid head turned to the curve's end. Decorative, drawn in a box of
 * `box` units that the stylesheet places and sizes. */
export function CurvedArrow({ className, box, from, bend, to, dashed }: { className: string; box: Point; from: Point; bend: Point; to: Point; dashed?: boolean }) {
  const angle = Math.atan2(to[1] - bend[1], to[0] - bend[0]);
  const back = [0.45, -0.45].map((turn) => `${(to[0] - 8 * Math.cos(angle + turn)).toFixed(1)} ${(to[1] - 8 * Math.sin(angle + turn)).toFixed(1)}`);
  const head = `M${to[0]} ${to[1]}L${back[0]}L${back[1]}Z`;
  return (
    <svg className={`ob-arrow ${className}`} viewBox={`0 0 ${box[0]} ${box[1]}`} aria-hidden="true" focusable="false">
      <path d={`M${from[0]} ${from[1]}Q${bend[0]} ${bend[1]} ${to[0]} ${to[1]}`} strokeDasharray={dashed ? "6 6" : undefined} />
      <path d={head} />
    </svg>
  );
}

/** Three short tangerine strokes that mark a card as the one that just changed. */
export function Rays({ className, d }: { className: string; d: string }) {
  return <svg className={`ob-rays ${className}`} viewBox="0 0 44 47" aria-hidden="true" focusable="false"><path d={d} /></svg>;
}
