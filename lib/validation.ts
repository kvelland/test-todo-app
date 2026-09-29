export const TODO_TITLE_MAX_LENGTH = 200;

export type TitleValidation = { ok: true; value: string } | { ok: false; error: string };

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
