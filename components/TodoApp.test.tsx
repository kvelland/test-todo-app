import { render, screen, waitFor } from "@testing-library/react";
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
    expect(input).toHaveFocus();
    expect(todos.listTodos).toHaveBeenCalledTimes(1);
  });

  it("lets the user add another todo while a create is in flight", async () => {
    const user = userEvent.setup();
    vi.mocked(todos.listTodos).mockResolvedValue({ ok: true, data: [] });
    let resolveFirst!: (value: todos.Result<Todo>) => void;
    vi.mocked(todos.createTodo)
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
      )
      .mockResolvedValueOnce({
        ok: true,
        data: makeTodo({ id: "2", title: "Second" }),
      });

    render(<TodoApp />);
    await screen.findByText("No todos yet");

    const input = screen.getByLabelText("New todo title");
    await user.type(input, "First{Enter}");

    // Cleared and still usable while the first create is pending.
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
    expect(screen.getByRole("button", { name: "Adding…" })).toBeInTheDocument();

    await user.type(input, "Second{Enter}");
    expect(todos.createTodo).toHaveBeenNthCalledWith(2, "Second");

    resolveFirst({ ok: true, data: makeTodo({ id: "1", title: "First" }) });
    expect(await screen.findByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
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

describe("TodoApp toggle", () => {
  it("toggles completion optimistically and persists it", async () => {
    const user = userEvent.setup();
    vi.mocked(todos.listTodos).mockResolvedValue({
      ok: true,
      data: [makeTodo()],
    });
    let resolveUpdate!: (value: todos.Result<Todo>) => void;
    vi.mocked(todos.updateTodo).mockReturnValue(
      new Promise((resolve) => {
        resolveUpdate = resolve;
      }),
    );

    render(<TodoApp />);
    const checkbox = await screen.findByRole("checkbox");
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);

    // Optimistic: checked before the API responds.
    expect(checkbox).toBeChecked();
    expect(screen.getByText("Buy milk").closest("li")).toHaveClass("todo--completed");
    expect(todos.updateTodo).toHaveBeenCalledWith("1", { completed: true });

    resolveUpdate({ ok: true, data: makeTodo({ completed: true }) });
    await waitFor(() => expect(checkbox).toBeEnabled());
    expect(checkbox).toBeChecked();
  });

  it("reverts and shows an error when saving fails", async () => {
    const user = userEvent.setup();
    vi.mocked(todos.listTodos).mockResolvedValue({
      ok: true,
      data: [makeTodo()],
    });
    vi.mocked(todos.updateTodo).mockResolvedValue({
      ok: false,
      error: "Network unreachable",
    });

    render(<TodoApp />);
    const checkbox = await screen.findByRole("checkbox");

    await user.click(checkbox);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not save: Network unreachable",
    );
    expect(checkbox).not.toBeChecked();
  });
});

describe("TodoApp delete", () => {
  it("removes the todo after the API confirms", async () => {
    const user = userEvent.setup();
    vi.mocked(todos.listTodos).mockResolvedValue({
      ok: true,
      data: [makeTodo(), makeTodo({ id: "2", title: "Walk the dog" })],
    });
    vi.mocked(todos.deleteTodo).mockResolvedValue({
      ok: true,
      data: undefined,
    });

    render(<TodoApp />);
    await user.click(await screen.findByRole("button", { name: 'Delete "Buy milk"' }));

    expect(todos.deleteTodo).toHaveBeenCalledWith("1");
    await waitFor(() => expect(screen.queryByText("Buy milk")).not.toBeInTheDocument());
    expect(screen.getByText("Walk the dog")).toBeInTheDocument();
  });

  it("shows the empty state after deleting the last todo", async () => {
    const user = userEvent.setup();
    vi.mocked(todos.listTodos).mockResolvedValue({
      ok: true,
      data: [makeTodo()],
    });
    vi.mocked(todos.deleteTodo).mockResolvedValue({
      ok: true,
      data: undefined,
    });

    render(<TodoApp />);
    await user.click(await screen.findByRole("button", { name: 'Delete "Buy milk"' }));

    expect(await screen.findByText("No todos yet")).toBeInTheDocument();
  });

  it("keeps the todo and shows an error when deleting fails", async () => {
    const user = userEvent.setup();
    vi.mocked(todos.listTodos).mockResolvedValue({
      ok: true,
      data: [makeTodo()],
    });
    vi.mocked(todos.deleteTodo).mockResolvedValue({
      ok: false,
      error: "Network unreachable",
    });

    render(<TodoApp />);
    await user.click(await screen.findByRole("button", { name: 'Delete "Buy milk"' }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not delete: Network unreachable",
    );
    expect(screen.getByText("Buy milk")).toBeInTheDocument();
  });
});

describe("TodoApp edit", () => {
  function setup() {
    vi.mocked(todos.listTodos).mockResolvedValue({
      ok: true,
      data: [makeTodo()],
    });
    render(<TodoApp />);
    return userEvent.setup();
  }

  it("saves the trimmed title on Enter", async () => {
    const user = setup();
    vi.mocked(todos.updateTodo).mockResolvedValue({
      ok: true,
      data: makeTodo({ title: "Buy oat milk" }),
    });

    await user.click(await screen.findByRole("button", { name: 'Edit "Buy milk"' }));
    const input = screen.getByLabelText("Edit todo title");
    expect(input).toHaveFocus();
    await user.clear(input);
    await user.type(input, "  Buy oat milk {Enter}");

    expect(todos.updateTodo).toHaveBeenCalledTimes(1);
    expect(todos.updateTodo).toHaveBeenCalledWith("1", {
      title: "Buy oat milk",
    });
    expect(await screen.findByText("Buy oat milk")).toBeInTheDocument();
    expect(screen.queryByLabelText("Edit todo title")).not.toBeInTheDocument();
  });

  it("saves on blur and supports double-click to edit", async () => {
    const user = setup();
    vi.mocked(todos.updateTodo).mockResolvedValue({
      ok: true,
      data: makeTodo({ title: "Buy bread" }),
    });

    await user.dblClick(await screen.findByText("Buy milk"));
    const input = screen.getByLabelText("Edit todo title");
    await user.clear(input);
    await user.type(input, "Buy bread");
    await user.tab();

    expect(todos.updateTodo).toHaveBeenCalledWith("1", { title: "Buy bread" });
    expect(await screen.findByText("Buy bread")).toBeInTheDocument();
  });

  it("cancels on Escape without saving", async () => {
    const user = setup();

    await user.click(await screen.findByRole("button", { name: 'Edit "Buy milk"' }));
    const input = screen.getByLabelText("Edit todo title");
    await user.clear(input);
    await user.type(input, "Something else{Escape}");

    expect(todos.updateTodo).not.toHaveBeenCalled();
    expect(screen.getByText("Buy milk")).toBeInTheDocument();
  });

  it("keeps editing and shows an error for an empty title", async () => {
    const user = setup();

    await user.click(await screen.findByRole("button", { name: 'Edit "Buy milk"' }));
    const input = screen.getByLabelText("Edit todo title");
    await user.clear(input);
    await user.type(input, "   {Enter}");

    expect(await screen.findByRole("alert")).toHaveTextContent("Title can't be empty.");
    expect(screen.getByLabelText("Edit todo title")).toBeInTheDocument();
    expect(todos.updateTodo).not.toHaveBeenCalled();
  });

  it("reverts the title and shows an error when saving fails", async () => {
    const user = setup();
    vi.mocked(todos.updateTodo).mockResolvedValue({
      ok: false,
      error: "Network unreachable",
    });

    await user.click(await screen.findByRole("button", { name: 'Edit "Buy milk"' }));
    const input = screen.getByLabelText("Edit todo title");
    await user.clear(input);
    await user.type(input, "Buy bread{Enter}");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not save: Network unreachable",
    );
    expect(screen.getByText("Buy milk")).toBeInTheDocument();
  });
});
