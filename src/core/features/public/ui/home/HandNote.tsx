import { HandLettering } from "./hand/HandLettering";

const lines = ["LESS GUESSING.", "MORE MOMENTUM."];

/** "Less guessing. More momentum." lettered by hand beside the hero's drawing, with its curved arrow; both are decorative. */
export function HandNote() {
  return (
    <div className="ob-note" aria-hidden="true">
      <svg className="ob-note-arrow" viewBox="0 0 83 50">
        <path d="M80 43Q37 53 11 5m-3 9 3-9 9 3" />
      </svg>
      <HandLettering className="ob-note-text" lines={lines} />
    </div>
  );
}
