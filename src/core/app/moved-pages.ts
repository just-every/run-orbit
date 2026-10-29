import {isFullOperator} from '../features/access/identity-class';

/** Addresses that moved when daily work stayed in the menu and set-up went under Settings (OR1, OR2), and when every
 * record took an address of its own (OR3). Each answers one 308 straight to its new path with the query string kept
 * as it came, before any page renders. A hash never reaches the server: the browser carries it through the redirect
 * and the page it lands on maps the old ones. */
const moved: [RegExp, (match: RegExpExecArray) => string][] = [
 [/^\/app\/(?:now|today)$/, () => '/app'],
 [/^\/app\/settings$/, () => '/app/settings/workspace'],
 [/^\/app\/(?:sources|capture)$/, () => '/app/settings/capture'],
 [/^\/app\/capture\/connect\/([^/]+)$/, match => `/app/settings/capture/connect/${match[1]}`],
 [/^\/app\/capture\/review$/, () => '/app/review'],
 [/^\/app\/forms$/, () => '/app/settings/forms'],
 [/^\/app\/imports$/, () => '/app/settings/data/import'],
 [/^\/app\/library$/, () => '/app/settings/mail/library'],
 [/^\/app\/new$/, () => '/app/opportunities/new'],
];

const lists: Record<string, string> = {opportunity: '/app/opportunities', contact: '/app/contacts', company: '/app/companies'};
const ulid = /^[0-9A-HJKMNP-TV-Z]{26}$/;

/** /app/records?kind=<kind>&record=<id> (every stored notification, mention, brief and task link) opens that record at its
 * own address; without a record, or with one that is not an id, the kind's list. The rest of the query stays. */
function recordAddress(url: URL) {
 const query = new URLSearchParams(url.search), kind = query.get('kind') ?? '', record = query.get('record') ?? '';
 query.delete('kind'); query.delete('record');
 const list = lists[kind] ?? lists.opportunity!, rest = query.size ? `?${query}` : '';
 return (ulid.test(record) ? `${list}/${record}` : list) + rest;
}

/** The redirect for an old address, or null. /app/access stays a collaborator's page and an invitation's landing; a
 * full operator without an invitation finds collaborators under Settings › Team. */
export async function movedPage(db: D1Database, url: URL, operatorId: string): Promise<Response | null> {
 const path = url.pathname.replace(/(.)\/+$/, '$1');
 let target = path === '/app/records' ? recordAddress(url) : moved.map(([pattern, to]) => {const match = pattern.exec(path); return match ? to(match) + url.search : null;}).find(Boolean) ?? null;
 if (!target && path === '/app/access' && !url.searchParams.has('invitation') && await isFullOperator(db, operatorId)) target = '/app/settings/team' + url.search;
 return target ? new Response(null, {status: 308, headers: {Location: target, 'Cache-Control': 'no-store'}}) : null;
}
