export const TODO_TITLE_MAX_LENGTH = 200;

export const TAG_NAME_MAX_LENGTH = 30;

export type TitleValidation = { ok: true; value: string } | { ok: false; error: string };

export type TagValidation = { ok: true; value: string } | { ok: false; error: string };

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
