import type { WorkspacePresentation } from "./operator-api";

/** Every date Orbit shows reads one way: "16 Oct 2026, 7:36 pm", in the given time zone or the browser's. */
export function formatDate(value: string | number | Date, timeZone?: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short", ...(timeZone ? { timeZone } : {}) }).format(date);
}

export function formatTime(value: string | number | Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-AU", { timeStyle: "short", ...(timeZone ? { timeZone } : {}) }).format(new Date(value));
}

/** A day without a time, such as a reporting window's edge: "16 Oct 2026". */
export function formatDay(value: string | number | Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", ...(timeZone ? { timeZone } : {}) }).format(new Date(value));
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
