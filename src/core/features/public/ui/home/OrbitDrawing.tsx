import "./orbit.css";
import { HandNote } from "./HandNote";
import { OrbitRings } from "./OrbitRings";
import { QueueStack } from "./QueueStack";
import { SignalIcon, type SignalKind } from "./SignalIcons";

const LABEL = "Drawing of Orbit's NOW queue. Three customer signals, a reply, a booked meeting and a submitted form, orbit the NOW planet and move Northwind renewal to number 01: score 86, band High. Why now: Customer reply. Acme pilot and Globex expansion follow at 02 and 03.";

const signals: { kind: SignalKind; title: string; detail: string; age: string }[] = [
  { kind: "reply", title: "Customer reply", detail: "“Looks good — can we talk next week?”", age: "2 min ago" },
  { kind: "meeting", title: "Meeting booked", detail: "Demo next Tuesday", age: "1 hour ago" },
  { kind: "form", title: "Form submitted", detail: "Requested a trial", age: "3 hours ago" }
];

/**
 * The hero's drawing: signals orbiting a tangerine NOW planet, each reaching it on a dashed path, and the NOW queue card
 * of the deal they moved to the top. Only the three signal kinds Orbit records appear (email.replied, meeting.booked,
 * form.submitted); the deals are sample data. Everything inside is decorative, so the figure is one labelled image.
 * With motion allowed, card 01 rises into place once on load; the markup is the finished state.
 */
export function OrbitDrawing() {
  return (
    <figure className="ob-orbit" role="img" aria-label={LABEL}>
      <div className="ob-orbit-art" aria-hidden="true">
        <OrbitRings />
        <div className="ob-now"><span>NOW</span></div>
        {signals.map(({ kind, title, detail, age }) => (
          <article className={`ob-signal ob-signal--${kind}`} key={kind}>
            <span className="ob-signal-icon"><SignalIcon kind={kind} /></span>
            <div><strong>{title}</strong><p>{detail}</p><small>{age}</small></div>
          </article>
        ))}
        <QueueStack />
        <HandNote />
      </div>
    </figure>
  );
}
