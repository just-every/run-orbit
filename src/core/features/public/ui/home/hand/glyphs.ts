/** Single-stroke capitals for the homepage's hand lettering, each a path in a 7 by 10 box with a slight wobble. Space
 * has no path; it only advances the pen. */
export const glyphs: Record<string, string> = {
  A: "M0.6 10 L3.5 0 L6.4 10 M1.9 6.6 L5.1 6.6",
  B: "M1 0 L1.1 10 L4 10 C7.2 10 7 5.2 4 5.2 L1 5 M1 0 L3.8 0 C6.6 0 6.4 5 3.8 5",
  C: "M6 2 C5 -0.3 1 -0.3 1 5 C1 10.3 5 10.4 6 8",
  D: "M1 0 L1.1 10 L3 10 C7.4 10 7.2 0 3 0 L1 0",
  E: "M6 0.2 L1 0 L1.1 10 L6 9.8 M1.1 5 L5 4.8",
  F: "M6 0.2 L1 0 L1.1 10 M1.1 5 L5 4.8",
  G: "M6 2 C5 -0.3 1 -0.3 1 5 C1 10.3 5.4 10.4 6 7 L6 5.6 L3.6 5.6",
  H: "M1 0 L1.1 10 M6 0 L6.1 10 M1.1 5 L6 4.8",
  I: "M3.5 0 L3.4 10",
  K: "M1 0 L1.1 10 M6 0 L1.2 5.5 M2.8 4 L6.2 10",
  L: "M1 0 L1.2 10 L6.2 9.8",
  M: "M0.8 10 L1 0 L3.6 7 L6.2 0 L6.4 10",
  N: "M1 10 L1 0 L6 10 L6.1 0",
  O: "M3.5 0 C0.2 0 0.4 10.2 3.6 10.2 C6.9 10.2 6.8 0 3.5 0",
  P: "M1 10 L1 0 L4 0 C7 0 7 5.4 4 5.4 L1 5.4",
  R: "M1 10 L1 0 L4 0 C7 0 7 5 4 5 L1 5 M4 5 L6.3 10",
  S: "M6 1.5 C5 -0.2 1.5 -0.3 1.3 2.6 C1.2 5.2 6 4.8 5.8 7.6 C5.6 10.4 1.8 10.4 0.8 8.6",
  T: "M0.5 0.2 L6.5 0 M3.5 0 L3.5 10",
  U: "M1 0 L1.1 7 C1.2 10.6 6 10.6 6 7 L6.1 0",
  W: "M0.3 0 L1.8 10 L3.5 3.5 L5.2 10 L6.7 0",
  Y: "M0.8 0 L3.5 5 L6.2 0 M3.5 5 L3.5 10",
  ".": "M2 9.7 L2.1 10",
  ",": "M2.4 9 L1.6 11.2"
};
export const ADVANCE = 8;
export const LINE_HEIGHT = 16;
/** Each following line steps this far right, the way a hand drifts. */
export const LINE_DRIFT = 3.5;
