import { describe, expect, it } from "vitest";
import {
  TAG_NAME_MAX_LENGTH,
  TODO_TITLE_MAX_LENGTH,
  validateDeadline,
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

describe("validateDeadline", () => {
  const OSLO = "Europe/Oslo";

  it("treats an empty date and time as no deadline", () => {
    expect(validateDeadline({ date: "", time: "" }, { timeZone: OSLO })).toEqual({
      ok: true,
      value: null,
    });
  });

  it("resolves a date-only deadline to the end of the local day", () => {
    expect(validateDeadline({ date: "2026-10-03", time: "" }, { timeZone: OSLO })).toEqual({
      ok: true,
      value: "2026-10-03T21:59:59.999Z",
    });
  });

  it("resolves a date and time to the exact local instant", () => {
    expect(validateDeadline({ date: "2026-10-03", time: "14:00" }, { timeZone: OSLO })).toEqual({
      ok: true,
      value: "2026-10-03T12:00:00.000Z",
    });
  });

  it("rejects a time without a date", () => {
    expect(validateDeadline({ date: "", time: "14:00" }, { timeZone: OSLO })).toEqual({
      ok: false,
      error: "Pick a date before setting a time.",
    });
  });

  it("rejects an impossible date", () => {
    expect(validateDeadline({ date: "2026-02-30", time: "" })).toEqual({
      ok: false,
      error: "That date isn't valid.",
    });
    expect(validateDeadline({ date: "not-a-date", time: "" })).toEqual({
      ok: false,
      error: "That date isn't valid.",
    });
  });

  it("rejects an impossible time", () => {
    expect(validateDeadline({ date: "2026-10-03", time: "24:00" })).toEqual({
      ok: false,
      error: "That time isn't valid.",
    });
    expect(validateDeadline({ date: "2026-10-03", time: "12:75" })).toEqual({
      ok: false,
      error: "That time isn't valid.",
    });
  });
});
