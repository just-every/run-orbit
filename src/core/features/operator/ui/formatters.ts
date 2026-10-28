import type { WorkspacePresentation } from "./operator-api";
import { workspaceTimeZone } from "../presentation-date";
export { setWorkspaceTimeZone, workspaceTimeZone, zoneLabel, formatDate, formatTime, formatDay, formatDateTime } from "../presentation-date";

/** Minutes the clock in `timeZone` runs ahead of UTC at this instant. */
function offsetMinutes(at: number, timeZone: string): number {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(at)).map(part => [part.type, part.value]));
  return (Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute)) - Math.floor(at / 60000) * 60000) / 60000;
}

/** A datetime-local value such as "2026-10-19T10:00", read on the workspace clock, as an ISO instant. */
export function workspaceInstant(local: string, timeZone?: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!match) throw new Error("Enter a date and time.");
  const zone = timeZone ?? workspaceTimeZone(), wall = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]));
  const first = wall - offsetMinutes(wall, zone) * 60000;
  return new Date(wall - offsetMinutes(first, zone) * 60000).toISOString();
}

/** An instant as a datetime-local value on the workspace clock, for a field's starting value. */
export function workspaceLocalInput(value: string | number | Date, timeZone?: string): string {
  const at = new Date(value).getTime();
  return new Date(at + offsetMinutes(at, timeZone ?? workspaceTimeZone()) * 60000).toISOString().slice(0, 16);
}

export function formatCurrency(cents: number, presentation: WorkspacePresentation): string {
  const parts = new Intl.NumberFormat("en-AU", { style: "currency", currency: presentation.currency, minimumFractionDigits: cents % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 }).formatToParts(cents / 100);
  return parts.map(part => part.type === "currency" && presentation.currency === "AUD" ? "A$" : part.value).join("");
}

export function label(value: string): string {
  const names: Record<string, string> = {
    'email.replied': 'Replied to by the customer',
    'email.sent': 'Email sent to the customer',
    'email.bounced': 'Delivery problem reported',
    'email.unsubscribed': 'Customer unsubscribed',
    'message.accepted': 'Accepted by the mail provider',
    'opportunity.evaluated': 'Opportunity priorities evaluated',
    'signal.recorded': 'Customer activity recorded',
    'manual_action': 'Review customer activity'
  };
  if (names[value]) return names[value];
  const policy = /^(opportunity\.prioritization|opportunity\.scoring|opportunity\.next-action)\.v(\d+)$/.exec(value);
  if (policy) return `${({'opportunity.prioritization':'Priority order','opportunity.scoring':'Scoring rules','opportunity.next-action':'Next action rules'} as Record<string,string>)[policy[1]!]} version ${policy[2]}`;
  return value.replaceAll("_", " ").replaceAll(".", " ").replaceAll("-", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

/** Earlier local events included an operator ID in this source label. */
export const sourceLabel=(source:string)=>source.startsWith('Operator-attested customer event (')?'Operator-attested customer event':source;
