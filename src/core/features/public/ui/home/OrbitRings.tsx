/** The orbit rings, the three dashed paths that carry a signal in to the NOW planet, and the moons. Coordinates are the
 * scene's own, 850 wide; the SVG scales with it. Decorative: the figure's label describes the scene. */
export function OrbitRings() {
  return (
    <svg className="ob-rings" viewBox="0 0 850 600" aria-hidden="true">
      <g className="ob-ring">
        <circle cx="411" cy="274" r="271" />
        <circle cx="411" cy="270" r="220" strokeDasharray="3 5" />
        <circle cx="411" cy="265" r="169" />
        <circle cx="413" cy="264" r="124" />
      </g>
      <path className="ob-path ob-path--reply" d="M290 72Q357 83 378 178" />
      <path className="ob-path ob-path--meeting" d="M623 116Q568 122 557 178" />
      <path className="ob-path ob-path--form" d="M230 318Q269 323 294 300" />
      <circle className="ob-moon ob-moon--hollow" cx="257" cy="200" r="16" />
      <circle className="ob-moon ob-moon--tangerine" cx="351" cy="112" r="9" />
      <circle className="ob-moon ob-moon--tangerine" cx="680" cy="244" r="14" />
      <circle className="ob-moon ob-moon--ink" cx="557" cy="178" r="9" />
      <circle className="ob-moon ob-moon--plain" cx="509" cy="72" r="5.5" />
      <circle className="ob-moon ob-moon--grey" cx="295" cy="300" r="6.5" />
      <circle className="ob-moon ob-moon--grey" cx="205" cy="437" r="8" />
    </svg>
  );
}
