import { describe, expect, it } from "vitest";
import { TODO_TITLE_MAX_LENGTH, validateTodoTitle } from "./validation";

describe("validateTodoTitle", () => {
  it("trims and accepts a normal title", () => {
    expect(validateTodoTitle("  Buy milk  ")).toEqual({
      ok: true,
      value: "Buy milk",
    });
  });

  it("rejects an empty or whitespace-only title", () => {
    expect(validateTodoTitle("   ")).toEqual({
      ok: false,
      error: "Title can't be empty.",
    });
  });

  it("accepts a title at the max length", () => {
    const title = "a".repeat(TODO_TITLE_MAX_LENGTH);
    expect(validateTodoTitle(title)).toEqual({ ok: true, value: title });
  });

  it("rejects a title over the max length", () => {
    expect(validateTodoTitle("a".repeat(TODO_TITLE_MAX_LENGTH + 1)).ok).toBe(false);
  });
});
