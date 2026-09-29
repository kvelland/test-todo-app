import { describe, expect, it } from "vitest";
import {
  TAG_NAME_MAX_LENGTH,
  TODO_TITLE_MAX_LENGTH,
  validateTagName,
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

describe("validateTagName", () => {
  it("trims and accepts a normal tag name", () => {
    expect(validateTagName("  Work  ")).toEqual({ ok: true, value: "Work" });
  });

  it("rejects an empty or whitespace-only name", () => {
    expect(validateTagName("   ")).toEqual({
      ok: false,
      error: "Tag name can't be empty.",
    });
  });

  it("accepts a name at the max length and rejects one over it", () => {
    const name = "a".repeat(TAG_NAME_MAX_LENGTH);
    expect(validateTagName(name)).toEqual({ ok: true, value: name });
    expect(validateTagName("a".repeat(TAG_NAME_MAX_LENGTH + 1)).ok).toBe(false);
  });

  it("rejects a name that duplicates an existing one, ignoring case", () => {
    expect(validateTagName("work", ["Work"])).toEqual({
      ok: false,
      error: "That tag already exists.",
    });
    expect(validateTagName("WORK", ["Work", "Home"])).toEqual({
      ok: false,
      error: "That tag already exists.",
    });
  });

  it("accepts a name that is not already in use", () => {
    expect(validateTagName("Groceries", ["Work", "Home"])).toEqual({
      ok: true,
      value: "Groceries",
    });
  });
});
