import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Todo } from "@/lib/pocketbase";
import * as todos from "@/lib/todos";
import TodoApp from "./TodoApp";

vi.mock("@/lib/todos", () => ({
  listTodos: vi.fn(),
  createTodo: vi.fn(),
  updateTodo: vi.fn(),
  deleteTodo: vi.fn(),
}));

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: "1",
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

describe("TodoApp list", () => {
  it("shows a loading state, then the todos", async () => {
    vi.mocked(todos.listTodos).mockResolvedValue({
      ok: true,
      data: [makeTodo(), makeTodo({ id: "2", title: "Walk the dog", completed: true })],
    });

    render(<TodoApp />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading todos…");
    expect(await screen.findByText("Buy milk")).toBeInTheDocument();
    expect(screen.getByText("Walk the dog").closest("li")).toHaveClass("todo--completed");
  });

  it("shows an empty state when there are no todos", async () => {
    vi.mocked(todos.listTodos).mockResolvedValue({ ok: true, data: [] });

    render(<TodoApp />);

    expect(await screen.findByText("No todos yet")).toBeInTheDocument();
  });

  it("shows the error when loading fails", async () => {
    vi.mocked(todos.listTodos).mockResolvedValue({
      ok: false,
      error: "Network unreachable",
    });

    render(<TodoApp />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load todos: Network unreachable",
    );
  });
});
