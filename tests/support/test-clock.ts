/** Keep weekday-sensitive fixtures ahead of D1's independent wall clock. */
export function nextWeeklyOccurrence(reference: string): number {
 const week = 7 * 86400000;
 const timestamp = Date.parse(reference);
 return timestamp + Math.ceil((Date.now() - timestamp) / week) * week;
}
