import type {RecordKind} from './records-api';

/** A Records list keeps its search, filters and view in its address (?q=harbour&stage=<id>&owner=<id>&band=high
 * &lifecycle=open&view=board), so Back from a record and a shared link both open the list as it was. */
export interface RecordsSearch {q?: string; pipeline?: string; stage?: string; owner?: string; band?: string; lifecycle?: string; queue?: string; view?: 'board'}

// The address's words for each filter, and the list API's names for them.
const filterKeys = {pipeline: 'pipeline_id', stage: 'stage_id', owner: 'owner_id', band: 'band', lifecycle: 'lifecycle', queue: 'queue_state'} as const;
type FilterWord = keyof typeof filterKeys;
const words = Object.keys(filterKeys) as FilterWord[];

/** The routes' validateSearch: keeps the words a list knows, as text, and drops empty ones. */
export function recordsSearch(search: Record<string, unknown>): RecordsSearch {
 const text = (value: unknown) => typeof value === 'string' || typeof value === 'number' ? String(value).slice(0, 500) : '';
 const result: RecordsSearch = {};
 const q = text(search.q);
 if (q) result.q = q;
 for (const word of words) { const value = text(search[word]); if (value) result[word] = value; }
 if (search.view === 'board') result.view = 'board';
 return result;
}

/** The list API's filters for an address's search. */
export function listFilters(search: RecordsSearch): Record<string, string> {
 return Object.fromEntries(words.filter(word => search[word]).map(word => [filterKeys[word], search[word]!]));
}

/** The address's search for the list API's filters. */
export function searchFilters(filters: Record<string, string>): Partial<RecordsSearch> {
 return Object.fromEntries(words.map(word => [word, filters[filterKeys[word]] || undefined]));
}

export const listPath: Record<RecordKind, '/app/opportunities' | '/app/contacts' | '/app/companies'> = {opportunity: '/app/opportunities', contact: '/app/contacts', company: '/app/companies'};
export const recordPath: Record<RecordKind, '/app/opportunities/$id' | '/app/contacts/$id' | '/app/companies/$id'> = {opportunity: '/app/opportunities/$id', contact: '/app/contacts/$id', company: '/app/companies/$id'};
/** A record's own address, for places that write a plain link. */
export const recordHref = (kind: RecordKind, id: string) => `${listPath[kind]}/${encodeURIComponent(id)}`;
export const pluralName: Record<RecordKind, string> = {opportunity: 'Opportunities', contact: 'Contacts', company: 'Companies'};
