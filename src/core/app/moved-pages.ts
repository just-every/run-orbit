import {isFullOperator} from '../features/access/identity-class';

/** Addresses that moved when daily work stayed in the menu and set-up went under Settings (OR1, OR2). Each answers
 * one 308 straight to its new path with the query string kept as it came, before any page renders. A hash never
 * reaches the server: the browser carries it through the redirect and the page it lands on maps the old ones. */
const moved: [RegExp, (match: RegExpExecArray) => string][] = [
 [/^\/app\/(?:now|today)$/, () => '/app'],
 [/^\/app\/settings$/, () => '/app/settings/workspace'],
 [/^\/app\/(?:sources|capture)$/, () => '/app/settings/capture'],
 [/^\/app\/capture\/connect\/([^/]+)$/, match => `/app/settings/capture/connect/${match[1]}`],
 [/^\/app\/capture\/review$/, () => '/app/review'],
 [/^\/app\/forms$/, () => '/app/settings/forms'],
 [/^\/app\/imports$/, () => '/app/settings/data/import'],
 [/^\/app\/library$/, () => '/app/settings/mail/library'],
];

/** The redirect for an old address, or null. /app/access stays a collaborator's page and an invitation's landing; a
 * full operator without an invitation finds collaborators under Settings › Team. */
export async function movedPage(db: D1Database, url: URL, operatorId: string): Promise<Response | null> {
 const path = url.pathname.replace(/(.)\/+$/, '$1');
 let target = moved.map(([pattern, to]) => {const match = pattern.exec(path); return match ? to(match) : null;}).find(Boolean) ?? null;
 if (!target && path === '/app/access' && !url.searchParams.has('invitation') && await isFullOperator(db, operatorId)) target = '/app/settings/team';
 return target ? new Response(null, {status: 308, headers: {Location: target + url.search, 'Cache-Control': 'no-store'}}) : null;
}
