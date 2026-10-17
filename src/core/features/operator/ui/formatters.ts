import type { WorkspacePresentation } from "./operator-api";

let workspaceZone: string | undefined;
/** The /app layout sets the workspace time zone before any page renders, so every time reads on one clock. */
export function setWorkspaceTimeZone(zone: string | null | undefined) { workspaceZone = zone || undefined; }
const clock = (timeZone?: string) => timeZone ?? workspaceZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
/** "New York time" for America/New_York; UTC stays UTC. */
export function zoneLabel(timeZone?: string): string {
  const zone = clock(timeZone);
  return zone === "UTC" || zone === "Etc/UTC" ? "UTC" : `${zone.split("/").pop()!.replaceAll("_", " ")} time`;
}

/** Every date Orbit shows reads one way, labelled with its clock: "16 Oct 2026, 7:36 pm (New York time)". Workspace time unless another zone is named. */
export function formatDate(value: string | number | Date, timeZone?: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : `${new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short", timeZone: clock(timeZone) }).format(date)} (${zoneLabel(timeZone)})`;
}

export function formatTime(value: string | number | Date, timeZone?: string): string {
  return `${new Intl.DateTimeFormat("en-AU", { timeStyle: "short", timeZone: clock(timeZone) }).format(new Date(value))} (${zoneLabel(timeZone)})`;
}

/** Minutes the clock in `timeZone` runs ahead of UTC at this instant. */
function offsetMinutes(at: number, timeZone: string): number {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(at)).map(part => [part.type, part.value]));
  return (Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute)) - Math.floor(at / 60000) * 60000) / 60000;
}

/** A datetime-local value such as "2026-10-19T10:00", read on the workspace clock, as an ISO instant. */
export function workspaceInstant(local: string, timeZone?: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!match) throw new Error("Enter a date and time.");
  const zone = clock(timeZone), wall = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]));
  const first = wall - offsetMinutes(wall, zone) * 60000;
  return new Date(wall - offsetMinutes(first, zone) * 60000).toISOString();
}

/** An instant as a datetime-local value on the workspace clock, for a field's starting value. */
export function workspaceLocalInput(value: string | number | Date, timeZone?: string): string {
  const at = new Date(value).getTime();
  return new Date(at + offsetMinutes(at, clock(timeZone)) * 60000).toISOString().slice(0, 16);
}

/** A day without a time, such as a reporting window's edge: "16 Oct 2026". */
export function formatDay(value: string | number | Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeZone: clock(timeZone) }).format(new Date(value));
}

export function formatDateTime(value: string | null, presentation: WorkspacePresentation): string {
  return value ? formatDate(value, presentation.timezone) : "Not recorded";
}

export function formatCurrency(cents: number, presentation: WorkspacePresentation): string {
  const parts = new Intl.NumberFormat("en-AU", { style: "currency", currency: presentation.currency, maximumFractionDigits: 0 }).formatToParts(cents / 100);
  return parts.map(part => part.type === "currency" && presentation.currency === "AUD" ? "A$" : part.value).join("");
}

export function label(value: string): string {
  return value.replaceAll("_", " ").replaceAll(".", " ").replaceAll("-", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

/** Earlier local events included an operator ID in this source label. */
export const sourceLabel=(source:string)=>source.startsWith('Operator-attested customer event (')?'Operator-attested customer event':source;
