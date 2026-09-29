import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { combineDeadline, formatDeadline } from "@/lib/deadline";
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
    deadline: "",
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

    expect(todos.createTodo).toHaveBeenCalledWith("Write tests", null);
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
    expect(todos.createTodo).toHaveBeenNthCalledWith(2, "Second", null);

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
    // Move focus out of the whole edit block (title + deadline fields).
    await user.tab({ shift: true });

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

/** Local calendar date (YYYY-MM-DD) for a Date, in the runtime zone. */
function localDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

describe("TodoApp deadlines", () => {
  it("sends the deadline when one is chosen", async () => {
    const user = userEvent.setup();
    vi.mocked(todos.listTodos).mockResolvedValue({ ok: true, data: [] });
    vi.mocked(todos.createTodo).mockResolvedValue({
      ok: true,
      data: makeTodo({ id: "2", title: "Ship it" }),
    });

    render(<TodoApp />);
    await screen.findByText("No todos yet");

    await user.type(screen.getByLabelText("New todo title"), "Ship it");
    await user.type(screen.getByLabelText("Deadline date"), "2027-01-15");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(todos.createTodo).toHaveBeenCalledWith("Ship it", combineDeadline("2027-01-15", null));
    expect(screen.getByLabelText("Deadline date")).toHaveValue("");
  });

  it("asks for a date when only a time is set", async () => {
    const user = userEvent.setup();
    vi.mocked(todos.listTodos).mockResolvedValue({ ok: true, data: [] });

    render(<TodoApp />);
    await screen.findByText("No todos yet");

    await user.type(screen.getByLabelText("New todo title"), "Ship it");
    await user.type(screen.getByLabelText("Deadline time"), "14:00");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Pick a date before setting a time.",
    );
    expect(todos.createTodo).not.toHaveBeenCalled();
  });

  it("marks a past deadline overdue", async () => {
    vi.mocked(todos.listTodos).mockResolvedValue({
      ok: true,
      data: [
        makeTodo({
          id: "1",
          title: "Late",
          deadline: combineDeadline("2020-01-01", null) as string,
        }),
      ],
    });

    render(<TodoApp />);
    await screen.findByText("Late");

    expect(screen.getByText("Overdue")).toBeInTheDocument();
  });

  it("never marks a completed todo overdue", async () => {
    vi.mocked(todos.listTodos).mockResolvedValue({
      ok: true,
      data: [
        makeTodo({
          id: "1",
          title: "Late but done",
          completed: true,
          deadline: combineDeadline("2020-01-01", null) as string,
        }),
      ],
    });

    render(<TodoApp />);
    await screen.findByText("Late but done");

    expect(screen.queryByText("Overdue")).not.toBeInTheDocument();
    expect(
      screen.getByText(formatDeadline(combineDeadline("2020-01-01", null) as string)),
    ).toBeInTheDocument();
  });

  it("says a deadline later today is due today", async () => {
    vi.mocked(todos.listTodos).mockResolvedValue({
      ok: true,
      data: [
        makeTodo({
          id: "1",
          title: "Today",
          deadline: combineDeadline(localDate(new Date()), null) as string,
        }),
      ],
    });

    render(<TodoApp />);
    await screen.findByText("Today");

    expect(screen.getByText("Due today")).toBeInTheDocument();
    expect(screen.queryByText("Overdue")).not.toBeInTheDocument();
  });

  it("shows the formatted deadline for an upcoming date", async () => {
    const deadline = combineDeadline("2999-01-15", null) as string;
    vi.mocked(todos.listTodos).mockResolvedValue({
      ok: true,
      data: [makeTodo({ id: "1", title: "Later", deadline })],
    });

    render(<TodoApp />);
    await screen.findByText("Later");

    expect(screen.getByText(formatDeadline(deadline))).toBeInTheDocument();
  });

  it("shows no deadline badge when a todo has none", async () => {
    vi.mocked(todos.listTodos).mockResolvedValue({
      ok: true,
      data: [makeTodo({ id: "1", title: "Someday" })],
    });

    render(<TodoApp />);
    await screen.findByText("Someday");

    expect(screen.getByText("Someday").closest("li")).not.toHaveTextContent("Due");
    expect(screen.queryByText("Overdue")).not.toBeInTheDocument();
  });

  it("edits a deadline through the inline edit fields", async () => {
    const user = userEvent.setup();
    vi.mocked(todos.listTodos).mockResolvedValue({
      ok: true,
      data: [makeTodo({ id: "1", title: "Buy milk" })],
    });
    vi.mocked(todos.updateTodo).mockResolvedValue({
      ok: true,
      data: makeTodo({
        id: "1",
        title: "Buy milk",
        deadline: combineDeadline("2027-01-15", null) as string,
      }),
    });

    render(<TodoApp />);
    const item = (await screen.findByText("Buy milk")).closest("li") as HTMLElement;
    await user.click(within(item).getByRole("button", { name: 'Edit "Buy milk"' }));

    await user.type(within(item).getByLabelText("Edit deadline date"), "2027-01-15");
    await user.type(within(item).getByLabelText("Edit todo title"), "{Enter}");

    expect(todos.updateTodo).toHaveBeenCalledWith("1", {
      deadline: combineDeadline("2027-01-15", null),
    });
  });

  it("keeps the new deadline when the editor is reopened before the save resolves", async () => {
    const user = userEvent.setup();
    vi.mocked(todos.listTodos).mockResolvedValue({
      ok: true,
      data: [makeTodo({ id: "1", title: "Buy milk" })],
    });
    let resolveUpdate!: (value: todos.Result<Todo>) => void;
    vi.mocked(todos.updateTodo).mockReturnValue(
      new Promise((resolve) => {
        resolveUpdate = resolve;
      }),
    );

    render(<TodoApp />);
    const first = (await screen.findByText("Buy milk")).closest("li") as HTMLElement;
    await user.click(within(first).getByRole("button", { name: 'Edit "Buy milk"' }));
    await user.type(within(first).getByLabelText("Edit deadline date"), "2027-01-15");
    await user.type(within(first).getByLabelText("Edit todo title"), "{Enter}");

    // The optimistic deadline is already showing; reopening the editor must not
    // fall back to the saved (deadline-less) todo and wipe it on the next save.
    const reopened = (await screen.findByText("Buy milk")).closest("li") as HTMLElement;
    await user.click(within(reopened).getByRole("button", { name: 'Edit "Buy milk"' }));
    expect(within(reopened).getByLabelText("Edit deadline date")).toHaveValue("2027-01-15");

    resolveUpdate({
      ok: true,
      data: makeTodo({
        id: "1",
        title: "Buy milk",
        deadline: combineDeadline("2027-01-15", null) as string,
      }),
    });
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });
});

describe("TodoApp sorting", () => {
  function fixture(): Todo[] {
    return [
      makeTodo({ id: "1", title: "No deadline" }),
      makeTodo({
        id: "2",
        title: "Later",
        deadline: combineDeadline("2999-05-01", null) as string,
      }),
      makeTodo({
        id: "3",
        title: "Sooner",
        deadline: combineDeadline("2999-01-01", null) as string,
      }),
    ];
  }

  function titles() {
    return screen.getAllByRole("listitem").map((item) => item.textContent ?? "");
  }

  afterEach(() => {
    window.localStorage.clear();
  });

  it("sorts by deadline earliest first, undated todos last", async () => {
    const user = userEvent.setup();
    vi.mocked(todos.listTodos).mockResolvedValue({ ok: true, data: fixture() });

    render(<TodoApp />);
    await screen.findByText("Sooner");

    await user.selectOptions(screen.getByLabelText("Sort todos"), "deadline-asc");

    const items = screen.getAllByRole("listitem");
    expect(within(items[0]).getByText("Sooner")).toBeInTheDocument();
    expect(within(items[1]).getByText("Later")).toBeInTheDocument();
    expect(within(items[2]).getByText("No deadline")).toBeInTheDocument();
  });

  it("sorts by deadline latest first, undated todos last", async () => {
    const user = userEvent.setup();
    vi.mocked(todos.listTodos).mockResolvedValue({ ok: true, data: fixture() });

    render(<TodoApp />);
    await screen.findByText("Sooner");

    await user.selectOptions(screen.getByLabelText("Sort todos"), "deadline-desc");

    const items = screen.getAllByRole("listitem");
    expect(within(items[0]).getByText("Later")).toBeInTheDocument();
    expect(within(items[1]).getByText("Sooner")).toBeInTheDocument();
    expect(within(items[2]).getByText("No deadline")).toBeInTheDocument();
  });

  it("remembers the chosen order and applies it on the next load", async () => {
    const user = userEvent.setup();
    vi.mocked(todos.listTodos).mockResolvedValue({ ok: true, data: fixture() });

    const first = render(<TodoApp />);
    await screen.findByText("Sooner");

    await user.selectOptions(screen.getByLabelText("Sort todos"), "deadline-desc");
    expect(window.localStorage.getItem("todo-sort")).toBe("deadline-desc");

    first.unmount();

    render(<TodoApp />);
    await screen.findByText("Sooner");
    expect(screen.getByLabelText("Sort todos")).toHaveValue("deadline-desc");
    expect(within(screen.getAllByRole("listitem")[0]).getByText("Later")).toBeInTheDocument();
  });

  it("falls back to the default for an unknown stored order", async () => {
    window.localStorage.setItem("todo-sort", "nonsense");
    vi.mocked(todos.listTodos).mockResolvedValue({ ok: true, data: fixture() });

    render(<TodoApp />);
    await screen.findByText("Sooner");

    expect(screen.getByLabelText("Sort todos")).toHaveValue("created");
    expect(titles()[0]).toContain("No deadline");
  });
});
