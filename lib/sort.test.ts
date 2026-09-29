import { describe, expect, it } from "vitest";

import type { Todo } from "./pocketbase";
import { DEFAULT_SORT, isSortOrder, sortTodos } from "./sort";

function todo(id: string, deadline: string, created: string): Todo {
  return {
    id,
    title: `Todo ${id}`,
    completed: false,
    deadline,
    created,
    updated: created,
    tags: [],
  };
}

// Newest first, matching how listTodos loads them and how TodoApp prepends.
const later = "2026-01-03 00:00:00.000Z";
const middle = "2026-01-02 00:00:00.000Z";
const earlier = "2026-01-01 00:00:00.000Z";

const todos: Todo[] = [
  todo("a", "2026-10-05 12:00:00.000Z", later),
  todo("b", "", middle),
  todo("c", "2026-10-01 12:00:00.000Z", earlier),
];

describe("isSortOrder", () => {
  it("accepts known orders", () => {
    expect(isSortOrder("created")).toBe(true);
    expect(isSortOrder("deadline-asc")).toBe(true);
    expect(isSortOrder("deadline-desc")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isSortOrder("deadline")).toBe(false);
    expect(isSortOrder("")).toBe(false);
    expect(isSortOrder(null)).toBe(false);
    expect(isSortOrder(3)).toBe(false);
  });
});

describe("sortTodos", () => {
  it("defaults to newest created first and leaves the input untouched", () => {
    const copy = [...todos];
    const result = sortTodos(todos, DEFAULT_SORT);
    expect(result.map((t) => t.id)).toEqual(["a", "b", "c"]);
    expect(todos).toEqual(copy);
    expect(result).not.toBe(todos);
  });

  it("orders deadline-asc with the earliest deadline first", () => {
    expect(sortTodos(todos, "deadline-asc").map((t) => t.id)).toEqual(["c", "a", "b"]);
  });

  it("orders deadline-desc with the latest deadline first", () => {
    expect(sortTodos(todos, "deadline-desc").map((t) => t.id)).toEqual(["a", "c", "b"]);
  });

  it("puts todos without a deadline last in both deadline directions", () => {
    expect(sortTodos(todos, "deadline-asc").at(-1)?.id).toBe("b");
    expect(sortTodos(todos, "deadline-desc").at(-1)?.id).toBe("b");
  });

  it("keeps newest-created first when deadlines are equal", () => {
    const sameDeadline: Todo[] = [
      todo("older", "2026-10-05 12:00:00.000Z", earlier),
      todo("newer", "2026-10-05 12:00:00.000Z", later),
    ];
    expect(sortTodos(sameDeadline, "deadline-asc").map((t) => t.id)).toEqual(["newer", "older"]);
    expect(sortTodos(sameDeadline, "deadline-desc").map((t) => t.id)).toEqual(["newer", "older"]);
  });

  it("keeps newest-created first when no deadlines are set at all", () => {
    const none: Todo[] = [todo("x", "", earlier), todo("y", "", later)];
    expect(sortTodos(none, "deadline-asc").map((t) => t.id)).toEqual(["y", "x"]);
  });
});
