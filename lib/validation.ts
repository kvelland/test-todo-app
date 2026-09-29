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
