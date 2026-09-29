import { describe, expect, it } from "vitest";
import {
  TODO_DESCRIPTION_MAX_LENGTH,
  TODO_TITLE_MAX_LENGTH,
  validateTodoDescription,
  validateTodoTitle,
} from "./validation";

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

describe("validateTodoDescription", () => {
  it("trims surrounding whitespace", () => {
    expect(validateTodoDescription("  buy oat milk  ")).toEqual({
      ok: true,
      value: "buy oat milk",
    });
  });

  it("accepts an empty or whitespace-only description as empty", () => {
    expect(validateTodoDescription("")).toEqual({ ok: true, value: "" });
    expect(validateTodoDescription("   \n  ")).toEqual({ ok: true, value: "" });
  });

  it("keeps interior line breaks", () => {
    expect(validateTodoDescription("  line one\nline two  ")).toEqual({
      ok: true,
      value: "line one\nline two",
    });
  });

  it("accepts a description at the max length", () => {
    const description = "a".repeat(TODO_DESCRIPTION_MAX_LENGTH);
    expect(validateTodoDescription(description)).toEqual({ ok: true, value: description });
  });

  it("rejects a description over the max length", () => {
    expect(validateTodoDescription("a".repeat(TODO_DESCRIPTION_MAX_LENGTH + 1)).ok).toBe(false);
  });
});
