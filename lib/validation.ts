export const TITLE_MAX_LENGTH = 200;

export type TitleValidation =
  | { ok: true; value: string }
  | { ok: false; error: string };

/**
 * Validate a todo title: trims surrounding whitespace, rejects an empty
 * (or whitespace-only) title, and enforces the max length from the
 * `todos.title` collection definition.
 */
export function validateTitle(raw: string): TitleValidation {
  const value = raw.trim();

  if (value.length === 0) {
    return { ok: false, error: 'Title is required' };
  }

  if (value.length > TITLE_MAX_LENGTH) {
    return { ok: false, error: `Title must be ${TITLE_MAX_LENGTH} characters or fewer` };
  }

  return { ok: true, value };
}
