import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

describe("TodoApp add", () => {
  it("creates a todo and shows it at the top without a reload", async () => {
    const user = userEvent.setup();
    vi.mocked(todos.listTodos).mockResolvedValue({
      ok: true,
      data: [makeTodo()],
    });
    vi.mocked(todos.createTodo).mockResolvedValue({
      ok: true,
      data: makeTodo({ id: "2", title: "Write tests" }),
    });

    render(<TodoApp />);
    await screen.findByText("Buy milk");

    const input = screen.getByLabelText("New todo title");
    await user.type(input, "  Write tests  {Enter}");

    expect(todos.createTodo).toHaveBeenCalledWith("Write tests");
    const items = await screen.findAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Write tests");
    expect(input).toHaveValue("");
    expect(todos.listTodos).toHaveBeenCalledTimes(1);
  });

  it("rejects an empty title without calling the API", async () => {
    const user = userEvent.setup();
    vi.mocked(todos.listTodos).mockResolvedValue({ ok: true, data: [] });

    render(<TodoApp />);
    await screen.findByText("No todos yet");

    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Title can't be empty.");
    expect(todos.createTodo).not.toHaveBeenCalled();
  });

  it("keeps the input and shows the error when creating fails", async () => {
    const user = userEvent.setup();
    vi.mocked(todos.listTodos).mockResolvedValue({ ok: true, data: [] });
    vi.mocked(todos.createTodo).mockResolvedValue({
      ok: false,
      error: "title: Cannot be blank.",
    });

    render(<TodoApp />);
    await screen.findByText("No todos yet");

    const input = screen.getByLabelText("New todo title");
    await user.type(input, "Oops{Enter}");

    expect(await screen.findByRole("alert")).toHaveTextContent("title: Cannot be blank.");
    expect(input).toHaveValue("Oops");
  });
});
