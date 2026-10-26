type DateValue = string | number | Date;
type DateStyle = "date" | "time" | "dateTime";

let workspaceZone: string | undefined;
const formats = new Map<string, Intl.DateTimeFormat>();

/** The /app layout sets this before rendering so operator pages share one clock. */
export function setWorkspaceTimeZone(zone: string | null | undefined) { workspaceZone = zone || undefined; }
export function workspaceTimeZone(): string { return workspaceZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone; }

/** Zone names are for Settings and reviews that compare two clocks. */
export function zoneLabel(timeZone = workspaceTimeZone()): string {
  return timeZone === "UTC" || timeZone === "Etc/UTC" ? "UTC" : `${timeZone.split("/").pop()!.replaceAll("_", " ")} time`;
}

function display(value: DateValue, style: DateStyle, timeZone = workspaceTimeZone()): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  // A calendar date has no clock to convert; keep its written day in every zone.
  if (style === "date" && typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) timeZone = "UTC";
  const key = `${style}:${timeZone}`;
  let formatter = formats.get(key);
  if (!formatter) {
    const options: Intl.DateTimeFormatOptions = { timeZone };
    if (style !== "time") options.dateStyle = "medium";
    if (style !== "date") options.timeStyle = "short";
    formatter = new Intl.DateTimeFormat("en-AU", options);
    formats.set(key, formatter);
  }
  return formatter.format(date);
}

/** An instant in the workspace zone, without a repeated zone suffix. */
export function formatDate(value: DateValue, timeZone?: string): string { return display(value, "dateTime", timeZone); }

/** A true calendar date: "27 Oct 2026", with no time of day. */
export function formatDay(value: DateValue, timeZone?: string): string { return display(value, "date", timeZone); }

/** A time in the workspace zone: "2:17 am". */
export function formatTime(value: DateValue, timeZone?: string): string { return display(value, "time", timeZone); }

/** A timestamp on the same clock and in the same style as dates and times. */
export function formatDateTime(value: DateValue | null | undefined, presentationOrZone?: { timezone: string } | string): string {
  if (value === null || value === undefined || value === "") return "Not recorded";
  const timeZone = typeof presentationOrZone === "string" ? presentationOrZone : presentationOrZone?.timezone;
  return display(value, "dateTime", timeZone);
}
