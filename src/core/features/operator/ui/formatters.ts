import type { WorkspacePresentation } from "./operator-api";

export function formatDateTime(value: string | null, presentation: WorkspacePresentation): string {
  if (!value) return "Not recorded";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: presentation.timezone
  }).format(date);
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
