import { SignalIcon, type SignalKind } from "./SignalIcons";

/** Card 01's evidence: the three signal kinds Orbit records, in the sample deal. 40 + 36 + 10 = the 86 on the badge. */
const evidence: { kind: SignalKind; lines: string[] }[] = [
  { kind: "reply", lines: ["Customer replied 2 minutes ago", "“Looks good — can we talk next week?”"] },
  { kind: "meeting", lines: ["Meeting booked — Demo next Tuesday"] },
  { kind: "form", lines: ["Form submitted — Requested a trial"] }
];

/** The NOW queue: card 01 (the deal a customer reply just moved to the top) over the two deals it passed. */
export function QueueStack() {
  return (
    <div className="ob-stack">
      <article className="ob-card ob-queue">
        <p className="ob-queue-label">NOW queue</p>
        <div className="ob-deal">
          <strong className="ob-rank">01</strong>
          <div className="ob-deal-title"><strong>Northwind renewal</strong><p>Northwind Traders</p></div>
          <div className="ob-queue-score"><strong>86</strong><span>High</span></div>
        </div>
        <ul className="ob-evidence">
          {evidence.map(({ kind, lines }) => (
            <li key={kind}><SignalIcon kind={kind} /><p>{lines.map((line) => <span key={line}>{line}</span>)}</p></li>
          ))}
        </ul>
        <p className="ob-why"><span>Why now</span><b>Customer reply</b></p>
      </article>
      <QueueRow rank="02" title="Acme pilot" score={72} className="ob-row--second" />
      <QueueRow rank="03" title="Globex expansion" score={68} className="ob-row--third" />
    </div>
  );
}

function QueueRow({ rank, title, score, className }: { rank: string; title: string; score: number; className: string }) {
  return (
    <div className={`ob-card ob-row ${className}`}>
      <strong>{rank}</strong><p>{title}</p><span>{score}</span>
    </div>
  );
}
