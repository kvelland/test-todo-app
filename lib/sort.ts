import type { Todo } from "./pocketbase";

/** How the todo list is ordered. */
export type SortOrder = "created" | "deadline-asc" | "deadline-desc";

export const SORT_ORDERS: readonly SortOrder[] = ["created", "deadline-asc", "deadline-desc"];

/** Matches the list's historical default: newest first. */
export const DEFAULT_SORT: SortOrder = "created";

export const SORT_LABELS: Record<SortOrder, string> = {
  created: "Date created",
  "deadline-asc": "Deadline, earliest first",
  "deadline-desc": "Deadline, latest first",
};

/** localStorage key holding the user's chosen sort order. */
export const SORT_STORAGE_KEY = "todo-sort";

const SORT_CHANGE_EVENT = "todo-sort-change";

export function isSortOrder(value: unknown): value is SortOrder {
  return typeof value === "string" && (SORT_ORDERS as readonly string[]).includes(value);
}

/** Current stored order, or the default when unset/unreadable. */
export function getStoredSort(): SortOrder {
  if (typeof window === "undefined") return DEFAULT_SORT;
  try {
    const stored = window.localStorage.getItem(SORT_STORAGE_KEY);
    return isSortOrder(stored) ? stored : DEFAULT_SORT;
  } catch {
    // Storage can be unavailable (private mode); fall back to the default.
    return DEFAULT_SORT;
  }
}

/** Server snapshot: there is no storage while rendering on the server. */
export function getServerSort(): SortOrder {
  return DEFAULT_SORT;
}

/** Subscribe to sort changes from this tab and from other tabs. */
export function subscribeToSort(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(SORT_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(SORT_CHANGE_EVENT, onChange);
  };
}

/** Remember the chosen order; the choice simply isn't persisted if storage fails. */
export function setStoredSort(order: SortOrder): void {
  try {
    window.localStorage.setItem(SORT_STORAGE_KEY, order);
  } catch {
    // Storage can be unavailable (private mode).
  }
  window.dispatchEvent(new Event(SORT_CHANGE_EVENT));
}

function timeValue(value: string): number | null {
  if (!value) return null;
  const time = new Date(value.trim().replace(" ", "T")).getTime();
  return Number.isNaN(time) ? null : time;
}

function createdValue(todo: Todo): number {
  return timeValue(todo.created) ?? 0;
}

/**
 * Returns a new array ordered by `order`. Todos without a deadline always sort
 * last in both deadline directions, and ties keep newest-created first, which is
 * the default order. The input array is not mutated.
 */
export function sortTodos(todos: Todo[], order: SortOrder): Todo[] {
  const sorted = [...todos];

  if (order === "created") {
    return sorted.sort((a, b) => createdValue(b) - createdValue(a));
  }

  const direction = order === "deadline-asc" ? 1 : -1;

  return sorted.sort((a, b) => {
    const aDeadline = timeValue(a.deadline);
    const bDeadline = timeValue(b.deadline);

    if (aDeadline === null && bDeadline === null) return createdValue(b) - createdValue(a);
    if (aDeadline === null) return 1;
    if (bDeadline === null) return -1;
    if (aDeadline !== bDeadline) return (aDeadline - bDeadline) * direction;

    return createdValue(b) - createdValue(a);
  });
}
