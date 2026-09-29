/**
 * Deadline helpers for todos.
 *
 * A todo deadline is stored as a PocketBase date string (UTC, e.g.
 * "2026-10-03 21:59:59.999Z"); an empty string means "no deadline".
 *
 * Deadlines are authored in the user's local time zone: the date is picked with
 * a date picker and the time of day is optional. With no time the deadline
 * resolves to the end of that local day (23:59:59.999), which lets us tell a
 * date-only deadline from one that carries a time.
 *
 * Every function takes an optional IANA `timeZone`. It defaults to the runtime's
 * local zone (the browser for users, an explicit zone in tests) so the same code
 * path stays deterministic and testable.
 */

export type DeadlineState = "none" | "overdue" | "today" | "upcoming";

const DATE_ONLY_TIME = "23:59:59.999";

/** Parses a stored deadline value; returns null for "" or an unparseable string. */
export function parseDeadline(value: string): Date | null {
  if (!value) return null;
  // PocketBase serialises dates with a space ("YYYY-MM-DD HH:mm:ss.SSSZ"),
  // which Date parsing accepts in Node/V8 but not in every engine; normalise it.
  const date = new Date(value.trim().replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Offset (ms) of `timeZone` from UTC at the given instant. */
function zoneOffsetMs(instantMs: number, timeZone?: string): number {
  // Intl only reports whole seconds, so compare at second precision to avoid
  // leaking the instant's milliseconds into the offset.
  const base = Math.floor(instantMs / 1000) * 1000;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(base));

  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return asUtc - base;
}

/** Converts a local wall-clock time in `timeZone` to the matching UTC instant. */
function wallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  ms: number,
  timeZone?: string,
): Date {
  const wall = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  // Resolve the offset at the wall time, then re-resolve at the candidate instant
  // so daylight-saving transitions land on the correct side.
  const firstGuess = wall - zoneOffsetMs(wall, timeZone);
  return new Date(wall - zoneOffsetMs(firstGuess, timeZone));
}

/**
 * Builds a stored deadline (UTC ISO string) from a local `YYYY-MM-DD` date and an
 * optional `HH:mm` time. No time resolves to the end of the local day. Returns
 * null when there is no date (no deadline).
 */
export function combineDeadline(
  date: string,
  time: string | null,
  timeZone?: string,
): string | null {
  if (!date) return null;

  const [year, month, day] = date.split("-").map(Number);
  if (time) {
    const [hour, minute] = time.split(":").map(Number);
    return wallTimeToUtc(year, month, day, hour, minute, 0, 0, timeZone).toISOString();
  }
  return wallTimeToUtc(year, month, day, 23, 59, 59, 999, timeZone).toISOString();
}

function calendarDay(date: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function clockTime(date: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/** True when the deadline is the end-of-day sentinel, i.e. authored without a time. */
export function isDateOnlyDeadline(value: string, timeZone?: string): boolean {
  const date = parseDeadline(value);
  if (!date) return false;
  return calendarDayTime(date, timeZone) === DATE_ONLY_TIME;
}

function calendarDayTime(date: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
    hour12: false,
  }).format(date);
}

/** Splits a stored deadline into the local date and time fields used for editing. */
export function splitDeadline(
  value: string,
  timeZone?: string,
): { date: string; time: string } | null {
  const date = parseDeadline(value);
  if (!date) return null;
  return {
    date: calendarDay(date, timeZone),
    time: isDateOnlyDeadline(value, timeZone) ? "" : clockTime(date, timeZone),
  };
}

/**
 * Compares the deadline's local calendar day with `now`'s local calendar day:
 * earlier is overdue, the same day is due today, later is upcoming. A missing or
 * unparseable deadline is "none". Completed todos are never shown as overdue;
 * callers apply that rule.
 */
export function deadlineState(value: string, now: Date, timeZone?: string): DeadlineState {
  const date = parseDeadline(value);
  if (!date) return "none";

  const day = calendarDay(date, timeZone);
  const today = calendarDay(now, timeZone);
  if (day < today) return "overdue";
  if (day === today) return "today";
  return "upcoming";
}

export type DeadlineFormatOptions = {
  now?: Date;
  locale?: string;
  timeZone?: string;
};

/** Human-readable "Due …" label, e.g. "Due 3 Oct", "Due today 14:00". */
export function formatDeadline(value: string, options: DeadlineFormatOptions = {}): string {
  const date = parseDeadline(value);
  if (!date) return "";

  const locale = options.locale ?? "en-GB";
  const timeZone = options.timeZone;
  const now = options.now ?? new Date();

  const state = deadlineState(value, now, timeZone);
  const day =
    state === "today"
      ? "today"
      : new Intl.DateTimeFormat(locale, {
          timeZone,
          day: "numeric",
          month: "short",
        }).format(date);

  const time = isDateOnlyDeadline(value, timeZone) ? "" : clockTime(date, timeZone);
  return time ? `Due ${day} ${time}` : `Due ${day}`;
}
