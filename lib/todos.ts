import { ClientResponseError } from "pocketbase";
import { pb, type Todo } from "./pocketbase";

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const COLLECTION = "todos";

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
    const records = await pb.collection(COLLECTION).getFullList<Todo>();
    return { ok: true, data: records };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function createTodo(title: string): Promise<Result<Todo>> {
  try {
    const record = await pb.collection(COLLECTION).create<Todo>({ title, completed: false });
    return { ok: true, data: record };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function updateTodo(
  id: string,
  patch: Partial<Pick<Todo, "title" | "completed">>,
): Promise<Result<Todo>> {
  try {
    const record = await pb.collection(COLLECTION).update<Todo>(id, patch);
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
