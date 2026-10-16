import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';

export interface GuideStep {
  title: string;
  /** The card's heading when it differs from the short list title. */
  heading?: string;
  body: ReactNode;
  /** A step that finishes elsewhere (a form post, a provider round trip) has no Next. */
  next?: string | false;
}

function stepFrom(search: string, count: number) {
  const value = Number(new URLSearchParams(search).get('step'));
  return Number.isInteger(value) && value >= 1 && value <= count ? value : 1;
}

/**
 * One provider at a time: a numbered list of every step on the left, the
 * current step's card on the right. Steps are links (`?step=N`), so the guide
 * works before hydration and a step can be bookmarked or shared.
 */
export function CaptureGuide({ label, steps, initial }: { label: string; steps: GuideStep[]; initial?: number }) {
  const [current, setCurrent] = useState(initial ?? 1);
  const card = useRef<HTMLElement>(null);
  useEffect(() => { if (!initial) setCurrent(stepFrom(window.location.search, steps.length)); }, [initial, steps.length]);
  useEffect(() => {
    const back = () => setCurrent(stepFrom(window.location.search, steps.length));
    window.addEventListener('popstate', back);
    return () => window.removeEventListener('popstate', back);
  }, [steps.length]);
  const href = (step: number) => {
    const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
    params.set('step', String(step));
    for (const key of ['connected', 'error', 'scopeSaved', 'created']) params.delete(key);
    return `?${params.toString()}`;
  };
  function go(step: number, event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    window.history.pushState(null, '', href(step));
    setCurrent(step);
    card.current?.focus({ preventScroll: true });
    card.current?.scrollIntoView({ block: 'nearest' });
  }
  const step = steps[current - 1]!;
  return <div className="capture-guide">
    <nav className="capture-guide__steps" aria-label={`${label} steps`}>
      <ol>
        {steps.map((item, index) => {
          const number = index + 1, state = number < current ? 'done' : number === current ? 'current' : 'pending';
          return <li key={item.title} className={`capture-guide__step capture-guide__step--${state}`}>
            <a href={href(number)} onClick={(event) => go(number, event)} aria-current={state === 'current' ? 'step' : undefined}>
              <span className="capture-guide__marker" aria-hidden="true">{state === 'done' ? '✓' : number}</span>
              <span className="capture-guide__text"><span>{number}. {item.title}</span><small>{state === 'done' ? 'Done' : state === 'current' ? 'Current step' : 'Not started'}</small></span>
            </a>
          </li>;
        })}
      </ol>
    </nav>
    <section ref={card} className="capture-guide__card" tabIndex={-1} aria-labelledby="capture-guide-heading">
      <p className="capture-guide__count">Step {current} of {steps.length}</p>
      <h2 id="capture-guide-heading">{step.heading ?? step.title}</h2>
      <div className="capture-guide__body">{step.body}</div>
      <div className="capture-guide__actions">
        {current > 1 ? <a className="orbit-button orbit-button--secondary" href={href(current - 1)} onClick={(event) => go(current - 1, event)}>Back</a> : <span />}
        {current < steps.length && step.next !== false ? <a className="orbit-button orbit-button--primary" href={href(current + 1)} onClick={(event) => go(current + 1, event)}>{step.next ?? `Next: ${steps[current]!.title.toLowerCase()}`} <span aria-hidden="true">→</span></a> : null}
      </div>
    </section>
  </div>;
}

/** A link to a provider console page, opened beside Orbit so the guide stays put. */
export function ConsoleLink({ href, children }: { href: string; children: ReactNode }) {
  return <a className="capture-console-link" href={href} target="_blank" rel="noopener noreferrer">{children}<span aria-hidden="true"> ↗</span><span className="capture-visually-hidden"> (opens in a new tab)</span></a>;
}
