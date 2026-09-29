import { combineDeadline } from "./deadline";

export const TODO_TITLE_MAX_LENGTH = 200;

export const TAG_NAME_MAX_LENGTH = 30;

export type TitleValidation = { ok: true; value: string } | { ok: false; error: string };

export type TagValidation = { ok: true; value: string } | { ok: false; error: string };

export type DeadlineInput = { date: string; time: string };
export type DeadlineValidation = { ok: true; value: string | null } | { ok: false; error: string };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

function isRealDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function isRealTime(value: string): boolean {
  if (!TIME_PATTERN.test(value)) return false;
  const [hour, minute] = value.split(":").map(Number);
  return hour <= 23 && minute <= 59;
}

/**
 * Normalises and validates a todo title. Shared by the add form (#5) and, later,
 * the edit flow (#7) so both enforce the same rules as the PocketBase schema:
 * trimmed, non-empty, and at most {@link TODO_TITLE_MAX_LENGTH} characters.
 */
export function validateTodoTitle(raw: string): TitleValidation {
  const value = raw.trim();

  if (value.length === 0) {
    return { ok: false, error: "Title can't be empty." };
  }

  if (value.length > TODO_TITLE_MAX_LENGTH) {
    return {
      ok: false,
      error: `Title must be ${TODO_TITLE_MAX_LENGTH} characters or fewer.`,
    };
  }

  return { ok: true, value };
}

/**
 * Normalises and validates a tag name. Mirrors {@link validateTodoTitle}: trimmed,
 * non-empty, and at most {@link TAG_NAME_MAX_LENGTH} characters. Tag names are also
 * unique case-insensitively, so `existingNames` (the names already in use) is checked
 * with a lowercased comparison.
 */
export function validateTagName(raw: string, existingNames: Iterable<string> = []): TagValidation {
  const value = raw.trim();

  if (value.length === 0) {
    return { ok: false, error: "Tag name can't be empty." };
  }

  if (value.length > TAG_NAME_MAX_LENGTH) {
    return {
      ok: false,
      error: `Tag name must be ${TAG_NAME_MAX_LENGTH} characters or fewer.`,
    };
  }

  const needle = value.toLowerCase();
  for (const name of existingNames) {
    if (name.trim().toLowerCase() === needle) {
      return { ok: false, error: "That tag already exists." };
    }
  }

  return { ok: true, value };
}

/**
 * Validates the date + optional time picked for a deadline and resolves it to the
 * stored UTC instant (PocketBase date string). An empty date means "no deadline"
 * and resolves to null; a time without a date is rejected. Dates are interpreted
 * in `timeZone` (the runtime's local zone by default).
 */
export function validateDeadline(
  raw: DeadlineInput,
  options: { timeZone?: string } = {},
): DeadlineValidation {
  const date = raw.date.trim();
  const time = raw.time.trim();

  if (!date) {
    return time
      ? { ok: false, error: "Pick a date before setting a time." }
      : { ok: true, value: null };
  }

  if (!isRealDate(date)) {
    return { ok: false, error: "That date isn't valid." };
  }

  if (time && !isRealTime(time)) {
    return { ok: false, error: "That time isn't valid." };
  }

  return { ok: true, value: combineDeadline(date, time || null, options.timeZone) };
}

export const TODO_DESCRIPTION_MAX_LENGTH = 2000;
/** Show a character counter once a draft gets this close to the limit. */
export const TODO_DESCRIPTION_COUNTER_THRESHOLD = TODO_DESCRIPTION_MAX_LENGTH - 200;

export type DescriptionValidation = { ok: true; value: string } | { ok: false; error: string };

/**
 * Normalises and validates a todo description. Optional: an empty (or
 * whitespace-only) description is valid and normalises to "". Leading and
 * trailing whitespace is trimmed, but interior line breaks are preserved so the
 * saved text keeps its shape. Mirror of the PocketBase schema field.
 */
export function validateTodoDescription(raw: string): DescriptionValidation {
  const value = raw.trim();

  if (value.length > TODO_DESCRIPTION_MAX_LENGTH) {
    return {
      ok: false,
      error: `Description must be ${TODO_DESCRIPTION_MAX_LENGTH} characters or fewer.`,
    };
  }

  return { ok: true, value };
}
