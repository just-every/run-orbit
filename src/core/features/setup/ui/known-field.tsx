import type { ReactNode } from 'react';

/** Native disclosure keeps confirmed values in the form, editable before hydration. */
export function KnownField({ label, value, children }: { label: string; value?: string; children: ReactNode }) {
  return value ? <details><summary>{label}: {value} · Edit</summary>{children}</details> : <>{children}</>;
}
