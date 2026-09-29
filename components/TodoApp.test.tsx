import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Tag, Todo } from "@/lib/pocketbase";
import * as todos from "@/lib/todos";
import TodoApp from "./TodoApp";

vi.mock("@/lib/todos", () => ({
  listTodos: vi.fn(),
  createTodo: vi.fn(),
  updateTodo: vi.fn(),
  deleteTodo: vi.fn(),
  listTags: vi.fn(),
  createTag: vi.fn(),
}));

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: "1",
    title: "Buy milk",
    completed: false,
    created: "2026-01-01 00:00:00.000Z",
    updated: "2026-01-01 00:00:00.000Z",
    tags: [],
    ...overrides,
  };
}

function makeTag(overrides: Partial<Tag> = {}): Tag {
  return {
    id: "tag1",
    name: "Work",
    created: "2026-01-01 00:00:00.000Z",
    updated: "2026-01-01 00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(todos.listTags).mockResolvedValue({ ok: true, data: [] });
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

    expect(todos.createTodo).toHaveBeenCalledWith("Write tests", []);
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
    expect(todos.createTodo).toHaveBeenNthCalledWith(2, "Second", []);

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

describe("TodoApp tags", () => {
  const work = makeTag();
  const home = makeTag({ id: "tag2", name: "Home" });

  function filterRegion() {
    return within(screen.getByRole("region", { name: "Filter by tag" }));
  }

  it("shows tags on a todo and lists them in the filter", async () => {
    vi.mocked(todos.listTags).mockResolvedValue({ ok: true, data: [home, work] });
    vi.mocked(todos.listTodos).mockResolvedValue({
      ok: true,
      data: [makeTodo({ tags: [work.id] })],
    });

    render(<TodoApp />);

    const item = (await screen.findByText("Buy milk")).closest("li")!;
    expect(within(item).getByText("Work")).toBeInTheDocument();
    expect(within(item).queryByText("Home")).not.toBeInTheDocument();
    expect(
      filterRegion().getByRole("button", { name: 'Filter by tag "Work"' }),
    ).toBeInTheDocument();
    expect(
      filterRegion().getByRole("button", { name: 'Filter by tag "Home"' }),
    ).toBeInTheDocument();
  });

  it("adds an existing tag while creating a todo", async () => {
    const user = userEvent.setup();
    vi.mocked(todos.listTags).mockResolvedValue({ ok: true, data: [work] });
    vi.mocked(todos.listTodos).mockResolvedValue({ ok: true, data: [] });
    vi.mocked(todos.createTodo).mockResolvedValue({
      ok: true,
      data: makeTodo({ id: "2", title: "Buy milk", tags: [work.id] }),
    });

    render(<TodoApp />);
    await screen.findByText("No todos yet");

    await user.type(screen.getByLabelText("Tags"), "Wor");
    await user.click(screen.getByRole("button", { name: 'Add tag "Work"' }));
    await user.type(screen.getByLabelText("New todo title"), "Buy milk");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(todos.createTodo).toHaveBeenCalledWith("Buy milk", [work.id]);
    const item = (await screen.findByText("Buy milk")).closest("li")!;
    expect(within(item).getByText("Work")).toBeInTheDocument();
  });

  it("creates a new tag from the add form and reuses it", async () => {
    const user = userEvent.setup();
    const groceries = makeTag({ id: "tag9", name: "Groceries" });
    vi.mocked(todos.listTags).mockResolvedValue({ ok: true, data: [] });
    vi.mocked(todos.listTodos).mockResolvedValue({ ok: true, data: [] });
    vi.mocked(todos.createTag).mockResolvedValue({ ok: true, data: groceries });

    render(<TodoApp />);
    await screen.findByText("No todos yet");

    await user.type(screen.getByLabelText("Tags"), "Groceries");
    await user.click(screen.getByRole("button", { name: 'Create tag "Groceries"' }));

    expect(todos.createTag).toHaveBeenCalledWith("Groceries");
    expect(
      filterRegion().getByRole("button", { name: 'Filter by tag "Groceries"' }),
    ).toBeInTheDocument();
  });

  it("filters the list by a single tag", async () => {
    const user = userEvent.setup();
    vi.mocked(todos.listTags).mockResolvedValue({ ok: true, data: [home, work] });
    vi.mocked(todos.listTodos).mockResolvedValue({
      ok: true,
      data: [
        makeTodo({ tags: [work.id] }),
        makeTodo({ id: "2", title: "Walk the dog", tags: [home.id] }),
      ],
    });

    render(<TodoApp />);
    await screen.findByText("Buy milk");

    await user.click(filterRegion().getByRole("button", { name: 'Filter by tag "Work"' }));

    expect(screen.getByText("Buy milk")).toBeInTheDocument();
    expect(screen.queryByText("Walk the dog")).not.toBeInTheDocument();
  });

  it("shows todos matching any of the selected tags", async () => {
    const user = userEvent.setup();
    vi.mocked(todos.listTags).mockResolvedValue({ ok: true, data: [home, work] });
    vi.mocked(todos.listTodos).mockResolvedValue({
      ok: true,
      data: [
        makeTodo({ tags: [work.id] }),
        makeTodo({ id: "2", title: "Walk the dog", tags: [home.id] }),
        makeTodo({ id: "3", title: "Email Sam", tags: [] }),
      ],
    });

    render(<TodoApp />);
    await screen.findByText("Buy milk");

    await user.click(filterRegion().getByRole("button", { name: 'Filter by tag "Work"' }));
    await user.click(filterRegion().getByRole("button", { name: 'Filter by tag "Home"' }));

    expect(screen.getByText("Buy milk")).toBeInTheDocument();
    expect(screen.getByText("Walk the dog")).toBeInTheDocument();
    expect(screen.queryByText("Email Sam")).not.toBeInTheDocument();
  });

  it("clears the filter and shows every todo again", async () => {
    const user = userEvent.setup();
    vi.mocked(todos.listTags).mockResolvedValue({ ok: true, data: [work] });
    vi.mocked(todos.listTodos).mockResolvedValue({
      ok: true,
      data: [makeTodo({ tags: [work.id] }), makeTodo({ id: "3", title: "Email Sam", tags: [] })],
    });

    render(<TodoApp />);
    await screen.findByText("Buy milk");

    await user.click(filterRegion().getByRole("button", { name: 'Filter by tag "Work"' }));
    expect(screen.queryByText("Email Sam")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear filter" }));

    expect(screen.getByText("Email Sam")).toBeInTheDocument();
    expect(filterRegion().getByRole("button", { name: 'Filter by tag "Work"' })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("applies the filter when a tag on a todo is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(todos.listTags).mockResolvedValue({ ok: true, data: [work] });
    vi.mocked(todos.listTodos).mockResolvedValue({
      ok: true,
      data: [makeTodo({ tags: [work.id] }), makeTodo({ id: "3", title: "Email Sam", tags: [] })],
    });

    render(<TodoApp />);
    const item = (await screen.findByText("Buy milk")).closest("li")!;

    await user.click(within(item).getByRole("button", { name: 'Filter by tag "Work"' }));

    expect(screen.queryByText("Email Sam")).not.toBeInTheDocument();
    expect(filterRegion().getByRole("button", { name: 'Filter by tag "Work"' })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("shows a matching empty state when no todo has the selected tag", async () => {
    const user = userEvent.setup();
    vi.mocked(todos.listTags).mockResolvedValue({ ok: true, data: [work] });
    vi.mocked(todos.listTodos).mockResolvedValue({
      ok: true,
      data: [makeTodo({ id: "3", title: "Email Sam", tags: [] })],
    });

    render(<TodoApp />);
    await screen.findByText("Email Sam");

    await user.click(filterRegion().getByRole("button", { name: 'Filter by tag "Work"' }));

    expect(screen.getByText("No todos match these tags")).toBeInTheDocument();
    expect(screen.getByText("Try a different tag or clear the filter.")).toBeInTheDocument();
  });

  it("edits the tags on an existing todo", async () => {
    const user = userEvent.setup();
    vi.mocked(todos.listTags).mockResolvedValue({ ok: true, data: [work] });
    vi.mocked(todos.listTodos).mockResolvedValue({
      ok: true,
      data: [makeTodo({ tags: [work.id] })],
    });
    vi.mocked(todos.updateTodo).mockResolvedValue({
      ok: true,
      data: makeTodo({ tags: [] }),
    });

    render(<TodoApp />);
    await screen.findByText("Buy milk");

    await user.click(screen.getByRole("button", { name: 'Edit tags for "Buy milk"' }));
    await user.click(screen.getByRole("button", { name: 'Remove tag "Work"' }));

    expect(todos.updateTodo).toHaveBeenCalledWith("1", { tags: [] });
  });
});
