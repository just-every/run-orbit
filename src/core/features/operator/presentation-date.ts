type DateValue = string | number | Date;
type DateStyle = "date" | "time" | "dateTime";

let workspaceZone: string | undefined;
let workspaceLocale = "en-AU";
const formats = new Map<string, Intl.DateTimeFormat>();

/** The /app layout sets this before rendering so operator pages share one clock. */
export function setWorkspaceTimeZone(zone: string | null | undefined) { workspaceZone = zone || undefined; }
export function workspaceTimeZone(): string { return workspaceZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone; }

/** The shell carries the browser locale from the request, including during SSR. */
export function setWorkspaceDateLocale(locale: string) { workspaceLocale = locale; }
export function workspaceDateLocale(): string { return workspaceZone?.startsWith("America/") ? "en-US" : workspaceLocale; }

/** Zone names are for Settings and reviews that compare two clocks. */
export function zoneLabel(timeZone = workspaceTimeZone()): string {
  return timeZone === "UTC" || timeZone === "Etc/UTC" ? "UTC" : `${timeZone.split("/").pop()!.replaceAll("_", " ")} time`;
}

function display(value: DateValue, style: DateStyle, timeZone = workspaceTimeZone()): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  // A calendar date has no clock to convert; keep its written day in every zone.
  if (style === "date" && typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) timeZone = "UTC";
  const locale = workspaceDateLocale();
  const key = `${locale}:${style}:${timeZone}`;
  let formatter = formats.get(key);
  if (!formatter) {
    const options: Intl.DateTimeFormatOptions = { timeZone };
    if (style !== "time") Object.assign(options, {year:"numeric", month:"2-digit", day:"2-digit", numberingSystem:"latn"});
    if (style !== "date") options.timeStyle = "short";
    formatter = new Intl.DateTimeFormat(locale, options);
    formats.set(key, formatter);
  }
  return formatter.format(date);
}

/** A timestamp in the workspace zone, without a repeated zone suffix. */
export function formatDate(value: DateValue, timeZone?: string): string { return display(value, "dateTime", timeZone); }

/** A calendar date in the workspace locale, without shifting date-only values. */
export function formatDay(value: DateValue, timeZone?: string): string { return display(value, "date", timeZone); }

/** A time in the workspace zone: "2:17 am". */
export function formatTime(value: DateValue, timeZone?: string): string { return display(value, "time", timeZone); }

/** A timestamp on the same clock and in the same style as dates and times. */
export function formatDateTime(value: DateValue | null | undefined, presentationOrZone?: { timezone: string } | string): string {
  if (value === null || value === undefined || value === "") return "Not recorded";
  const timeZone = typeof presentationOrZone === "string" ? presentationOrZone : presentationOrZone?.timezone;
  return display(value, "dateTime", timeZone);
}

/** The same calendar formatter supplies the field hint, display and parsing order. */
function inputParts() {
  return new Intl.DateTimeFormat(workspaceDateLocale(), {year:"numeric",month:"2-digit",day:"2-digit",timeZone:"UTC",numberingSystem:"latn"})
    .formatToParts(new Date("2006-11-22T00:00:00Z"));
}
export function dateInputPlaceholder(withTime = false): string {
  return inputParts().map(part => part.type === "year" ? "yyyy" : part.type === "month" ? "mm" : part.type === "day" ? "dd" : part.value).join("") + (withTime ? " HH:mm" : "");
}
/** A workspace wall-clock ISO value, without converting its calendar day. */
export function formatDateInput(local: string): string {
  if (!local) return "";
  const [day,time] = local.split("T");
  return formatDay(day!) + (time ? ` ${time.slice(0,5)}` : "");
}
/** Read exactly the displayed order. Never delegate ambiguous dates to Date.parse. */
export function parseDateInput(text: string, withTime = false): string {
  const hint = dateInputPlaceholder(withTime), fail = () => { throw new Error(`Enter a date${withTime ? " and time" : ""} as ${hint}.`); };
  const match = /^(.*?)(?:\s+(\d{1,2}):(\d{2}))?$/.exec(text.trim());
  if (!match || Boolean(match[2]) !== withTime) return fail();
  const fields = inputParts().filter(part => ["year","month","day"].includes(part.type));
  const values = match[1]!.split(/[^0-9]+/);
  if (values.length !== 3 || values.some((value,index) => !new RegExp(fields[index]!.type === "year" ? "^\\d{4}$" : "^\\d{1,2}$").test(value))) return fail();
  const parts = Object.fromEntries(fields.map((field,index) => [field.type,Number(values[index])]));
  const {year,month,day} = parts as {year:number;month:number;day:number};
  const calendar = new Date(0); calendar.setUTCFullYear(year,month-1,day); calendar.setUTCHours(0,0,0,0);
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month-1 || calendar.getUTCDate() !== day) return fail();
  const iso = `${String(year).padStart(4,"0")}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  if (!withTime) return iso;
  if (Number(match[2]) > 23 || Number(match[3]) > 59) return fail();
  return `${iso}T${match[2]!.padStart(2,"0")}:${match[3]}`;
}
