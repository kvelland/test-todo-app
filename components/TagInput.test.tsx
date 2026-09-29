import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Tag } from "@/lib/pocketbase";
import * as todos from "@/lib/todos";
import TagInput from "./TagInput";

vi.mock("@/lib/todos", () => ({
  createTag: vi.fn(),
}));

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
});

describe("TagInput", () => {
  it("suggests matching available tags and adds one on click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const work = makeTag();
    const home = makeTag({ id: "tag2", name: "Home" });

    render(
      <TagInput label="Tags" selected={[]} availableTags={[work, home]} onChange={onChange} />,
    );

    await user.type(screen.getByLabelText("Tags"), "wor");

    expect(screen.getByRole("button", { name: 'Add tag "Work"' })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: 'Add tag "Home"' })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: 'Add tag "Work"' }));

    expect(onChange).toHaveBeenCalledWith([work]);
    expect(screen.getByLabelText("Tags")).toHaveValue("");
  });

  it("does not suggest tags that are already selected", async () => {
    const user = userEvent.setup();
    const work = makeTag();

    render(<TagInput label="Tags" selected={[work]} availableTags={[work]} onChange={vi.fn()} />);

    await user.type(screen.getByLabelText("Tags"), "work");

    expect(screen.queryByRole("button", { name: 'Add tag "Work"' })).not.toBeInTheDocument();
  });

  it("offers to create a tag that does not exist and reports it", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onCreated = vi.fn();
    const groceries = makeTag({ id: "tag9", name: "Groceries" });
    vi.mocked(todos.createTag).mockResolvedValue({ ok: true, data: groceries });

    render(
      <TagInput
        label="Tags"
        selected={[]}
        availableTags={[makeTag()]}
        onChange={onChange}
        onCreated={onCreated}
      />,
    );

    await user.type(screen.getByLabelText("Tags"), "Groceries");
    await user.click(screen.getByRole("button", { name: 'Create tag "Groceries"' }));

    expect(todos.createTag).toHaveBeenCalledWith("Groceries");
    expect(onCreated).toHaveBeenCalledWith(groceries);
    expect(onChange).toHaveBeenCalledWith([groceries]);
  });

  it("does not offer to create a name that already exists, ignoring case", async () => {
    const user = userEvent.setup();

    render(
      <TagInput
        label="Tags"
        selected={[]}
        availableTags={[makeTag({ name: "Work" })]}
        onChange={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText("Tags"), "work");

    expect(screen.queryByRole("button", { name: /Create tag/ })).not.toBeInTheDocument();
  });

  it("does not offer to create an empty name", async () => {
    const user = userEvent.setup();

    render(<TagInput label="Tags" selected={[]} availableTags={[]} onChange={vi.fn()} />);

    await user.type(screen.getByLabelText("Tags"), "   ");

    expect(screen.queryByRole("button", { name: /Create tag/ })).not.toBeInTheDocument();
  });

  it("removes a selected tag", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const work = makeTag();
    const home = makeTag({ id: "tag2", name: "Home" });

    render(
      <TagInput label="Tags" selected={[work, home]} availableTags={[]} onChange={onChange} />,
    );

    await user.click(screen.getByRole("button", { name: 'Remove tag "Work"' }));

    expect(onChange).toHaveBeenCalledWith([home]);
  });

  it("shows the error when creating a tag fails", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    vi.mocked(todos.createTag).mockResolvedValue({ ok: false, error: "Network unreachable" });

    render(<TagInput label="Tags" selected={[]} availableTags={[]} onChange={onChange} />);

    await user.type(screen.getByLabelText("Tags"), "Groceries");
    await user.click(screen.getByRole("button", { name: 'Create tag "Groceries"' }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Network unreachable");
    expect(onChange).not.toHaveBeenCalled();
  });
});
