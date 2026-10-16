import { useId, useRef, useState } from 'react';
import './capture-copy-field.css';

/** A value the owner pastes somewhere else, with its copy button attached. Wraps on a phone, readable before hydration. `block` keeps line breaks, for a snippet. */
export function CopyField({ label, value, block = false }: { label: string; value: string; block?: boolean }) {
  const id = useId(), text = useRef<HTMLSpanElement>(null);
  const [copied, setCopied] = useState(false);
  function select() {
    const range = document.createRange();
    if (!text.current) return;
    range.selectNodeContents(text.current);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      select();
    }
  }
  return <div className={block ? 'capture-copy capture-copy--block' : 'capture-copy'}>
    <span id={`${id}-label`} hidden>{label}</span>
    <span ref={text} className="capture-copy__value" role="textbox" aria-readonly="true" aria-labelledby={`${id}-label`} tabIndex={0} onFocus={select}>{value}</span>
    <button type="button" className="capture-copy__button" onClick={() => void copy()} aria-label={`Copy ${label.toLowerCase()}`}>{copied ? 'Copied' : 'Copy'}</button>
    <span className="capture-copy__status" role="status">{copied ? `${label} copied` : ''}</span>
  </div>;
}
