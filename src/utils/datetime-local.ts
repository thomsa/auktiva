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

/** A `datetime-local` value read as an instant. */
export type DateTimeLocalParse =
  /** `iso` is null when the field is empty (no date). */
  | { ok: true; iso: string | null }
  /** Not a real local date and time, such as a five-digit year. */
  | { ok: false };

const DATE_TIME_LOCAL =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/;

/**
 * Reads a `datetime-local` value (local time, no offset) as a UTC ISO string.
 * An empty value is `{ ok: true, iso: null }`; anything that is not a real
 * local date and time is `{ ok: false }`, so a typo is never mistaken for
 * "no end date".
 */
export function parseDateTimeLocal(value: string): DateTimeLocalParse {
  if (!value) return { ok: true, iso: null };
  if (!DATE_TIME_LOCAL.test(value)) return { ok: false };
  const date = new Date(value);
  // Reject values the Date constructor rolls over (31 February) and local
  // times that do not exist (inside a daylight-saving gap).
  if (
    Number.isNaN(date.getTime()) ||
    toDateTimeLocalValue(date) !== value.slice(0, 16)
  ) {
    return { ok: false };
  }
  return { ok: true, iso: date.toISOString() };
}
