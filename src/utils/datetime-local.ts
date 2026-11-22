/**
 * Helpers for `<input type="datetime-local">`, whose value has no time zone
 * and is read and written in the browser's local time. Call them in the
 * browser only (after mount), so server and client renders stay identical.
 */

/** Formats an instant as a `datetime-local` value in the browser's time zone. */
export function toDateTimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Formats an ISO instant (or null) as a `datetime-local` value ("" for null). */
export function isoToDateTimeLocalValue(iso: string | null): string {
  return iso ? toDateTimeLocalValue(new Date(iso)) : "";
}

/**
 * Converts a `datetime-local` value (local time, no offset) to an ISO string
 * in UTC. Returns null for an empty or invalid value.
 */
export function dateTimeLocalToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
