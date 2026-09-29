import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientResponseError } from "pocketbase";
import type { Todo } from "./pocketbase";

const { collection } = vi.hoisted(() => ({
  collection: {
    getFullList: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("./pocketbase", () => ({
  pb: { collection: () => collection },
}));

import { createTodo, deleteTodo, listTodos, updateTodo } from "./todos";

function todo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: "rec1",
    title: "Buy milk",
    completed: false,
    created: "2026-01-01 00:00:00.000Z",
    updated: "2026-01-01 00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listTodos", () => {
  it("returns ok with the records", async () => {
    const records = [todo(), todo({ id: "rec2", title: "Walk the dog", completed: true })];
    collection.getFullList.mockResolvedValue(records);

    await expect(listTodos()).resolves.toEqual({ ok: true, data: records });
    expect(collection.getFullList).toHaveBeenCalledTimes(1);
    expect(collection.getFullList).toHaveBeenCalledWith({ sort: "-created" });
  });

  it("returns a failure result with the server message", async () => {
    collection.getFullList.mockRejectedValue(
      new ClientResponseError({
        status: 500,
        response: { message: "Something failed upstream." },
      }),
    );

    await expect(listTodos()).resolves.toEqual({
      ok: false,
      error: "Something failed upstream.",
    });
  });
});

describe("createTodo", () => {
  it("sends completed: false and returns the created record", async () => {
    const created = todo({ id: "new1", title: "Read a book" });
    collection.create.mockResolvedValue(created);

    await expect(createTodo("Read a book")).resolves.toEqual({
      ok: true,
      data: created,
    });
    expect(collection.create).toHaveBeenCalledWith({
      title: "Read a book",
      completed: false,
    });
  });

  it("maps a field validation error to a field-level message", async () => {
    collection.create.mockRejectedValue(
      new ClientResponseError({
        status: 400,
        response: {
          message: "Failed to create record.",
          data: {
            title: { code: "validation_required", message: "Cannot be blank." },
          },
        },
      }),
    );

    await expect(createTodo("")).resolves.toEqual({
      ok: false,
      error: "title: Cannot be blank.",
    });
  });

  it("joins multiple field validation messages", async () => {
    collection.create.mockRejectedValue(
      new ClientResponseError({
        status: 400,
        response: {
          message: "Failed to create record.",
          data: {
            title: { message: "Cannot be blank." },
            completed: { message: "Must be a boolean." },
          },
        },
      }),
    );

    await expect(createTodo("")).resolves.toEqual({
      ok: false,
      error: "title: Cannot be blank.; completed: Must be a boolean.",
    });
  });

  it("falls back to the field name when a detail has no message", async () => {
    collection.create.mockRejectedValue(
      new ClientResponseError({
        status: 400,
        response: {
          message: "Failed to create record.",
          data: { title: { code: "validation_required" } },
        },
      }),
    );

    await expect(createTodo("")).resolves.toEqual({
      ok: false,
      error: "title",
    });
  });
});

describe("updateTodo", () => {
  it("sends the patch and returns the updated record", async () => {
    const updated = todo({ completed: true });
    collection.update.mockResolvedValue(updated);

    await expect(updateTodo("rec1", { completed: true })).resolves.toEqual({
      ok: true,
      data: updated,
    });
    expect(collection.update).toHaveBeenCalledWith("rec1", { completed: true });
  });

  it("maps a not-found error to the server message", async () => {
    collection.update.mockRejectedValue(
      new ClientResponseError({
        status: 404,
        response: { message: "The requested resource wasn't found." },
      }),
    );

    await expect(updateTodo("missing", { title: "x" })).resolves.toEqual({
      ok: false,
      error: "The requested resource wasn't found.",
    });
  });
});

describe("deleteTodo", () => {
  it("resolves ok with undefined data on success", async () => {
    collection.delete.mockResolvedValue(undefined);

    await expect(deleteTodo("rec1")).resolves.toEqual({
      ok: true,
      data: undefined,
    });
    expect(collection.delete).toHaveBeenCalledWith("rec1");
  });

  it("returns the server message when the record is missing", async () => {
    collection.delete.mockRejectedValue(
      new ClientResponseError({
        status: 404,
        response: { message: "The requested resource wasn't found." },
      }),
    );

    await expect(deleteTodo("missing")).resolves.toEqual({
      ok: false,
      error: "The requested resource wasn't found.",
    });
  });
});

describe("error normalization", () => {
  it("uses the message of a generic Error", async () => {
    collection.getFullList.mockRejectedValue(new Error("Network unreachable"));

    await expect(listTodos()).resolves.toEqual({
      ok: false,
      error: "Network unreachable",
    });
  });

  it("falls back to a non-empty message for unknown rejections", async () => {
    collection.getFullList.mockRejectedValue("boom");

    await expect(listTodos()).resolves.toEqual({
      ok: false,
      error: "PocketBase request failed",
    });
  });

  it("falls back for a ClientResponseError that carries no message", async () => {
    collection.getFullList.mockRejectedValue(new ClientResponseError({}));

    const result = await listTodos();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.length).toBeGreaterThan(0);
    }
  });
});
