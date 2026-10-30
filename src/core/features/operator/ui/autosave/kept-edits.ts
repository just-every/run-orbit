/** A change waiting for the server is kept in this browser too (orbit.kept.<form key>.<field>: value, base, time) from
 * the moment its save starts until the server answers, so a reload, a closed tab or leaving on purpose never drops it.
 * Every read and write is guarded: without storage the page works and only this safety net is missing. */
export interface KeptEdit { value: unknown; base: unknown; at: string }
const prefix = 'orbit.kept.';
const name = (form: string, field: string) => `${prefix}${form}.${field}`;

export function keepEdit(form: string, field: string, value: unknown, base: unknown) {
 try { localStorage.setItem(name(form, field), JSON.stringify({value, base, at: new Date().toISOString()} satisfies KeptEdit)); } catch { /* storage unavailable */ }
}
export function dropEdit(form: string, field: string) {
 try { localStorage.removeItem(name(form, field)); } catch { /* storage unavailable */ }
}
/** The kept changes of one form, by field, newer than the copy the page shows (a copy saved after them already holds
 * them or replaced them). */
export function keptEdits(form: string, newerThan?: string | null): Record<string, KeptEdit> {
 const kept: Record<string, KeptEdit> = {}, start = `${prefix}${form}.`;
 try {
  for (let index = 0; index < localStorage.length; index++) {
   const key = localStorage.key(index);
   if (!key?.startsWith(start)) continue;
   const edit = JSON.parse(localStorage.getItem(key) ?? 'null') as KeptEdit | null;
   if (edit && typeof edit.at === 'string' && 'value' in edit && (!newerThan || edit.at > newerThan)) kept[key.slice(start.length)] = edit;
  }
 } catch { return {}; }
 return kept;
}
