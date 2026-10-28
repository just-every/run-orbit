import type { RecordKind } from './records-api';
/** The record open in this tab, kept so a page reload reopens it. Writing the
 * address bar would make the router re-run its sign-in checks on every open. */
const key = 'orbit.records.open';
export function rememberOpenRecord(kind: RecordKind, id: string | undefined) {
  try { if (id) sessionStorage.setItem(key, JSON.stringify({ kind, id })); else sessionStorage.removeItem(key); } catch { /* storage unavailable: a reload shows the list */ }
}
/** Only an actual reload of this page reopens the remembered record; arriving from elsewhere starts at the list. */
export function reloadedOpenRecord(): { kind: RecordKind; id: string } | null {
  try {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (navigation?.type !== 'reload') return null;
    const value = JSON.parse(sessionStorage.getItem(key) ?? 'null');
    return value && ['opportunity', 'contact', 'company'].includes(value.kind) && /^[0-9A-HJKMNP-TV-Z]{26}$/.test(value.id) ? value : null;
  } catch { return null; }
}

/** Closing or deleting a record clears both ways this tab can reopen it. */
export function clearOpenRecord(){
 rememberOpenRecord('opportunity',undefined);
 const address=new URL(window.location.href);
 if(address.searchParams.has('record')){address.searchParams.delete('record');window.history.replaceState(window.history.state,'',address.pathname+address.search+address.hash);}
}
