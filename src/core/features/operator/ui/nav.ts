/** Orbit's menus: the owner's daily jobs, the Settings areas that take the bar over, and a collaborator's pages.
 * Each item names the addresses it stands for. A match ending in "/*" covers that path and everything under it;
 * any other match is that path only. The menu marks one item: the one with the longest matching address (DL6). */
export interface NavItem { label: string; path: string; match: readonly string[] }
export interface OperatorMenu { mode: 'daily' | 'settings'; label: string; items: readonly NavItem[]; end: NavItem | null; current: NavItem | undefined }

export const dailyItems: readonly NavItem[] = [
 {label: 'NOW', path: '/app', match: ['/app']},
 {label: 'Brief', path: '/app/brief', match: ['/app/brief']},
 {label: 'Tasks', path: '/app/tasks', match: ['/app/tasks/*']},
 {label: 'Records', path: '/app/opportunities', match: ['/app/opportunities/*', '/app/contacts/*', '/app/companies/*']},
 {label: 'Reports', path: '/app/reports', match: ['/app/reports', '/app/dashboards/*']},
 {label: 'Notifications', path: '/app/notifications', match: ['/app/notifications']},
];
// Settings opens its first area straight away, so the menu never links through the /app/settings redirect.
export const settingsItem: NavItem = {label: 'Settings', path: '/app/settings/workspace', match: ['/app/settings/*', '/delegation/*']};
export const settingsAreas: readonly NavItem[] = [
 {label: 'Workspace', path: '/app/settings/workspace', match: ['/app/settings/workspace']},
 // Connected applications are server-rendered under /delegation and belong to Team.
 {label: 'Team', path: '/app/settings/team', match: ['/app/settings/team', '/delegation/*']},
 {label: 'Pipeline', path: '/app/settings/pipeline', match: ['/app/settings/pipeline']},
 {label: 'Capture', path: '/app/settings/capture', match: ['/app/settings/capture/*']},
 {label: 'Mail', path: '/app/settings/mail', match: ['/app/settings/mail/*']},
 {label: 'Forms', path: '/app/settings/forms', match: ['/app/settings/forms']},
 {label: 'Integrations', path: '/app/settings/integrations', match: ['/app/settings/integrations']},
 {label: 'Data', path: '/app/settings/data', match: ['/app/settings/data/*']},
];
const collaboratorPages: readonly NavItem[] = [
 {label: 'Shared records', path: '/app/shared-records', match: ['/app/shared-records']},
 {label: 'Reports', path: '/app/reports', match: ['/app/reports', '/app/dashboards/*']},
 {label: 'Notifications', path: '/app/notifications', match: ['/app/notifications']},
];
const collaboratorSettings: NavItem = {label: 'Settings', path: '/app/access', match: ['/app/access']};

function matchLength(pattern: string, pathname: string) {
 if (!pattern.endsWith('/*')) return pattern === pathname ? pattern.length : -1;
 const base = pattern.slice(0, -2);
 return pathname === base || pathname.startsWith(`${base}/`) ? base.length : -1;
}
const normal = (pathname: string) => pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

/** The item whose matching address is the longest, or none when the page is outside every item. */
export function currentItem(items: readonly NavItem[], pathname: string): NavItem | undefined {
 const path = normal(pathname);
 let best: NavItem | undefined, length = -1;
 for (const item of items) for (const pattern of item.match) {
  const next = matchLength(pattern, path);
  if (next > length) { best = item; length = next; }
 }
 return best;
}

/** Settings takes the bar over on its own pages; everywhere else the bar holds the daily jobs. */
export const settingsPage = (pathname: string) => settingsItem.match.some(pattern => matchLength(pattern, normal(pathname)) >= 0);

export function operatorMenu(pathname: string, collaborator = false, reports = true): OperatorMenu {
 if (collaborator) {
  const items = collaboratorPages.filter(item => reports || item.label !== 'Reports');
  return {mode: 'daily', label: 'Main menu', items, end: collaboratorSettings, current: currentItem([...items, collaboratorSettings], pathname)};
 }
 if (settingsPage(pathname)) return {mode: 'settings', label: 'Settings menu', items: settingsAreas, end: null, current: currentItem(settingsAreas, pathname)};
 return {mode: 'daily', label: 'Main menu', items: dailyItems, end: settingsItem, current: currentItem([...dailyItems, settingsItem], pathname)};
}
