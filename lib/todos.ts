import { ClientResponseError } from "pocketbase";
import { pb, type Tag, type Todo } from "./pocketbase";

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const COLLECTION = "todos";
const TAGS_COLLECTION = "tags";

function toError(error: unknown): string {
  if (error instanceof ClientResponseError) {
    const data = error.response?.data;
    if (data && Object.keys(data).length > 0) {
      const messages = Object.entries(data)
        .map(([field, detail]) => {
          const message = (detail as { message?: string } | undefined)?.message;
          return message ? `${field}: ${message}` : field;
        })
        .join("; ");
      if (messages) {
        return messages;
      }
    }
    if (error.message) {
      return error.message;
    }
    return "PocketBase request failed";
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "PocketBase request failed";
}

export async function listTodos(): Promise<Result<Todo[]>> {
  try {
    const records = await pb.collection(COLLECTION).getFullList<Todo>({ sort: "-created" });
    return { ok: true, data: records };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function createTodo(
  title: string,
  deadline?: string | null,
  tags: string[] = [],
  description = "",
): Promise<Result<Todo>> {
  try {
    const record = await pb.collection(COLLECTION).create<Todo>({
      title,
      description,
      completed: false,
      deadline: deadline ?? "",
      tags,
    });
    return { ok: true, data: record };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function updateTodo(
  id: string,
  patch: Partial<Pick<Todo, "title" | "completed" | "description" | "deadline" | "tags">>,
): Promise<Result<Todo>> {
  try {
    const record = await pb.collection(COLLECTION).update<Todo>(id, patch);
    return { ok: true, data: record };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function listTags(): Promise<Result<Tag[]>> {
  try {
    const records = await pb.collection(TAGS_COLLECTION).getFullList<Tag>({ sort: "name" });
    return { ok: true, data: records };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

/**
 * Creates a tag, or returns the existing one when a tag with the same name (ignoring
 * case) is already present. The database's unique index is case-sensitive, so this
 * application-side check keeps tag names unique case-insensitively.
 */
export async function createTag(name: string): Promise<Result<Tag>> {
  try {
    const trimmed = name.trim();
    const existing = await pb.collection(TAGS_COLLECTION).getFullList<Tag>();
    const match = existing.find((tag) => tag.name.toLowerCase() === trimmed.toLowerCase());
    if (match) {
      return { ok: true, data: match };
    }

    const record = await pb.collection(TAGS_COLLECTION).create<Tag>({ name: trimmed });
    return { ok: true, data: record };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function deleteTodo(id: string): Promise<Result<void>> {
  try {
    await pb.collection(COLLECTION).delete(id);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}
