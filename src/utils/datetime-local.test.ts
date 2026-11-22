import assert from "node:assert/strict";
import test from "node:test";
import {
  isoToDateTimeLocalValue,
  parseDateTimeLocal,
  toDateTimeLocalValue,
} from "@/utils/datetime-local";

// Expected instants are built with the local-time Date constructor, so the
// assertions hold in whatever time zone the tests run.
const localIso = (...parts: [number, number, number, number, number, number?, number?]) =>
  new Date(...parts).toISOString();

test("an empty value is a valid 'no date'", () => {
  assert.deepEqual(parseDateTimeLocal(""), { ok: true, iso: null });
});

test("minute, second and millisecond values convert from local time to UTC", () => {
  assert.deepEqual(parseDateTimeLocal("2027-01-05T10:30"), {
    ok: true,
    iso: localIso(2027, 0, 5, 10, 30),
  });
  assert.deepEqual(parseDateTimeLocal("2027-01-05T10:30:15"), {
    ok: true,
    iso: localIso(2027, 0, 5, 10, 30, 15),
  });
  assert.deepEqual(parseDateTimeLocal("2027-01-05T10:30:15.250"), {
    ok: true,
    iso: localIso(2027, 0, 5, 10, 30, 15, 250),
  });
});

test("values that are not a real local date and time are rejected", () => {
  for (const value of [
    "2027-02-31T10:00", // rolls over into March
    "2027-01-05T24:00", // rolls over into the next day
    "2027-01-05T25:00",
    "20261-01-01T10:00", // five-digit year
    "2027-01-05T10:30Z", // an offset is not a local time
    "2027-01-05T10:30+01:00",
    "2027-01-05",
    "2027-1-5T10:30",
    "next week",
    " 2027-01-05T10:30",
  ]) {
    assert.deepEqual(parseDateTimeLocal(value), { ok: false }, value);
  }
});

/** The first local time in 2027 that does not exist (a DST gap), if any. */
function findDstGap(): string | null {
  for (let day = 0; day < 366; day++) {
    for (let hour = 0; hour < 24; hour++) {
      for (const minute of [0, 30]) {
        const date = new Date(2027, 0, 1 + day, hour, minute);
        if (date.getHours() !== hour || date.getMinutes() !== minute) {
          const probe = new Date(2027, 0, 1 + day);
          const pad = (n: number) => String(n).padStart(2, "0");
          return `${probe.getFullYear()}-${pad(probe.getMonth() + 1)}-${pad(
            probe.getDate(),
          )}T${pad(hour)}:${pad(minute)}`;
        }
      }
    }
  }
  return null;
}

test("a local time inside a daylight-saving gap is rejected", (t) => {
  const gap = findDstGap();
  if (!gap) {
    t.skip("the runtime time zone has no daylight-saving gap");
    return;
  }
  assert.deepEqual(parseDateTimeLocal(gap), { ok: false }, gap);
});

test("formatting and parsing round-trip", () => {
  const date = new Date(2027, 6, 9, 8, 5);
  const local = toDateTimeLocalValue(date);
  assert.equal(local, "2027-07-09T08:05");
  assert.equal(isoToDateTimeLocalValue(date.toISOString()), local);
  assert.deepEqual(parseDateTimeLocal(local), {
    ok: true,
    iso: date.toISOString(),
  });
  assert.equal(isoToDateTimeLocalValue(null), "");
});
