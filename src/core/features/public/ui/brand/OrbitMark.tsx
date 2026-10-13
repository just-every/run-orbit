/** Orbit's mark: a solid tangerine planet with a small ink moon biting a clean cutout from its upper-right edge, no tile. The bite is part of the planet's single path, so any number of instances on a page need no unique ids. */
export function OrbitMark({ className = "" }: { className?: string }) {
  return (
    <svg className={`ob-mark ${className}`} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path d="M16.61 3.7A13.4 13.4 0 1 0 28.3 15.39A8.4 8.4 0 0 1 16.61 3.7Z" fill="var(--ob-tangerine)" />
      <circle cx="23.5" cy="8.5" r="5.2" fill="var(--ob-ink)" />
    </svg>
  );
}

/** The lockup: mark plus the product name. */
export function OrbitLockup({ name, imageUrl }: { name: string; imageUrl: string | null }) {
  return (
    <span className="ob-brand">
      {imageUrl ? <img className="ob-mark" src={imageUrl} alt="" /> : <OrbitMark />}
      <span className="ob-brand-name">{name}</span>
    </span>
  );
}
