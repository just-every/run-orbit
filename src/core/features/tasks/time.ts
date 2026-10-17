import { localTime } from '../outreach/time';
const pad = (value: number, length = 2) => String(value).padStart(length, '0');
export function taskLocalInput(value: string, timezone: string): string {
 const date = new Date(value), local = localTime(date, timezone);
 return `${local.day}T${pad(local.hour)}:${pad(local.minute)}:${pad(date.getUTCSeconds())}.${pad(date.getUTCMilliseconds(), 3)}`;
}
export function taskLocalClock(value: string, timezone: string): string { return taskLocalInput(value, timezone).split('T')[1]!; }
/** Earlier instant for a repeated clock minute; spring gaps shift forward by the gap.
 * The saved recurrence clock remains unchanged, so the following day returns to it. */
export function taskInstant(local: string, timezone: string): string {
 if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{3})?)?$/.test(local)) throw new Error('Enter a local date and time.');
 const wall = Date.parse(`${local}Z`);
 if (!Number.isFinite(wall) || new Date(wall).toISOString().slice(0, 16) !== local.slice(0, 16)) throw new Error('Enter a valid date and time.');
 const offsets = new Set<number>();
 for (const days of [-2, -1, 0, 1, 2]) {
  const instant = wall + days * 86400000;
  offsets.add(Date.parse(`${taskLocalInput(new Date(instant).toISOString(), timezone)}Z`) - instant);
 }
 const candidates = [...offsets].map(offset => wall - offset).sort((a, b) => a - b);
 const exact = candidates.find(value => Date.parse(`${taskLocalInput(new Date(value).toISOString(), timezone)}Z`) === wall);
 if (exact !== undefined) return new Date(exact).toISOString();
 const forward = candidates.map(value => ({ value, delta: Date.parse(`${taskLocalInput(new Date(value).toISOString(), timezone)}Z`) - wall })).filter(candidate => candidate.delta > 0).sort((a, b) => a.delta - b.delta || a.value - b.value)[0];
 if (!forward) throw new Error('This date and time cannot be resolved in the selected timezone.');
 return new Date(forward.value).toISOString();
}
export function shiftTaskDay(day: string, days: number): string {
 const date = new Date(`${day}T12:00:00.000Z`); date.setUTCDate(date.getUTCDate() + days);
 return date.toISOString().slice(0, 10);
}
export function nextTaskDue(dueAt: string, recurrence: 'daily' | 'weekly', timezone: string, clock: string): string {
 return taskInstant(`${shiftTaskDay(localTime(new Date(dueAt), timezone).day, recurrence === 'weekly' ? 7 : 1)}T${clock}`, timezone);
}
export function taskDayWindow(day: string, timezone: string): [string, string] {
 return [taskInstant(`${day}T00:00`, timezone), taskInstant(`${shiftTaskDay(day, 1)}T00:00`, timezone)];
}
