"use client";

import { useRef, useState } from "react";
import type { Tag, Todo } from "@/lib/pocketbase";
import { deleteTodo, updateTodo } from "@/lib/todos";
import { TODO_TITLE_MAX_LENGTH, validateTodoTitle } from "@/lib/validation";
import TagChips from "./TagChips";
import TagInput from "./TagInput";

const LEAVE_MS = 280;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

type TodoItemProps = {
  todo: Todo;
  /** Position in the list, used to stagger the entrance animation. */
  index?: number;
  onChanged: (todo: Todo) => void;
  onDeleted: (id: string) => void;
  /** All known tags, used to resolve this todo's tag ids to names. */
  availableTags?: Tag[];
  onTagCreated?: (tag: Tag) => void;
  /** Applies a tag to the list filter; makes the chips clickable. */
  onFilterTag?: (tagId: string) => void;
};

export default function TodoItem({
  todo,
  index = 0,
  onChanged,
  onDeleted,
  availableTags = [],
  onTagCreated,
  onFilterTag,
}: TodoItemProps) {
  // Optimistic values shown while a save is in flight; null means "use the saved todo".
  const [optimisticCompleted, setOptimisticCompleted] = useState<boolean | null>(null);
  const [optimisticTitle, setOptimisticTitle] = useState<string | null>(null);
  const [optimisticTags, setOptimisticTags] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [draft, setDraft] = useState(todo.title);
  // Guards against Enter/Escape and the blur that follows both committing.
  const committedRef = useRef(false);

  const completed = optimisticCompleted ?? todo.completed;
  const title = optimisticTitle ?? todo.title;
  const toggling = optimisticCompleted !== null;
  const tagIds = optimisticTags ?? todo.tags;
  const todoTags = availableTags.filter((tag) => tagIds.includes(tag.id));

  async function handleToggle() {
    const next = !completed;
    setError(null);
    setOptimisticCompleted(next);

    const result = await updateTodo(todo.id, { completed: next });

    setOptimisticCompleted(null);
    if (result.ok) {
      onChanged(result.data);
    } else {
      // Revert to the last saved value and surface the failure.
      setError(`Could not save: ${result.error}`);
    }
  }

  async function handleDelete() {
    setError(null);
    setDeleting(true);

    const result = await deleteTodo(todo.id);

    if (result.ok) {
      // Let the item fold away before it leaves the list.
      setLeaving(true);
      window.setTimeout(() => onDeleted(todo.id), prefersReducedMotion() ? 0 : LEAVE_MS);
    } else {
      // Keep the item in the list and surface the failure.
      setDeleting(false);
      setError(`Could not delete: ${result.error}`);
    }
  }

  function startEdit() {
    setDraft(title);
    setError(null);
    committedRef.current = false;
    setEditing(true);
  }

  function cancelEdit() {
    committedRef.current = true;
    setEditing(false);
    setError(null);
  }

  async function saveEdit() {
    if (committedRef.current) return;

    const validation = validateTodoTitle(draft);
    if (!validation.ok) {
      // Stay in edit mode so the user can correct the title.
      setError(validation.error);
      return;
    }

    committedRef.current = true;
    setEditing(false);
    setError(null);

    if (validation.value === todo.title) return;

    setOptimisticTitle(validation.value);
    const result = await updateTodo(todo.id, { title: validation.value });
    setOptimisticTitle(null);

    if (result.ok) {
      onChanged(result.data);
    } else {
      setError(`Could not save: ${result.error}`);
    }
  }

  async function saveTags(next: Tag[]) {
    const nextIds = next.map((tag) => tag.id);
    setError(null);
    setOptimisticTags(nextIds);

    const result = await updateTodo(todo.id, { tags: nextIds });

    setOptimisticTags(null);
    if (result.ok) {
      onChanged(result.data);
    } else {
      setError(`Could not save: ${result.error}`);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void saveEdit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
    }
  }

  const className = [
    "todo",
    completed && "todo--completed",
    editing && "todo--editing",
    deleting && "todo--deleting",
    leaving && "todo--leaving",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li className={className} style={{ "--i": Math.min(index, 8) } as React.CSSProperties}>
      <label className="check">
        <input
          type="checkbox"
          className="check__input"
          checked={completed}
          onChange={handleToggle}
          disabled={toggling}
          aria-label={`Mark "${title}" as ${completed ? "not complete" : "complete"}`}
        />
        <span className="check__box" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M5.5 12.5l4 4 9-9.5" />
          </svg>
        </span>
      </label>
      <div className="todo__body">
        {editing ? (
          <input
            type="text"
            className="todo__edit"
            // Focus moves here as the direct result of the user asking to edit.
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => void saveEdit()}
            maxLength={TODO_TITLE_MAX_LENGTH}
            aria-label="Edit todo title"
          />
        ) : (
          <span className="todo__title" onDoubleClick={startEdit}>
            {title}
          </span>
        )}
      </div>
      {editingTags ? (
        <div className="todo__tags-editor">
          <TagInput
            label={`Tags for "${title}"`}
            selected={todoTags}
            availableTags={availableTags}
            onChange={(next) => void saveTags(next)}
            onCreated={onTagCreated}
          />
        </div>
      ) : (
        <TagChips tags={todoTags} onSelect={onFilterTag} />
      )}
      <div className="todo__actions">
        <button
          type="button"
          className="icon-button"
          onClick={() => setEditingTags((value) => !value)}
          aria-label={`Edit tags for "${title}"`}
          aria-pressed={editingTags}
          title={editingTags ? "Done editing tags" : "Edit tags"}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 11.5V5a2 2 0 0 1 2-2h6.5L21 12.5 12.5 21z" />
            <path d="M7.5 7.5h.01" />
          </svg>
        </button>
        {editing ? null : (
          <button
            type="button"
            className="icon-button"
            onClick={startEdit}
            aria-label={`Edit "${title}"`}
            title="Edit"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" />
              <path d="M13.5 6.5l4 4" />
            </svg>
          </button>
        )}
        <button
          type="button"
          className="icon-button icon-button--danger"
          onClick={handleDelete}
          disabled={deleting}
          aria-label={`Delete "${title}"`}
          title={deleting ? "Deleting…" : "Delete"}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 7h14" />
            <path d="M10 4h4" />
            <path d="M7 7l1 12a1.5 1.5 0 0 0 1.5 1.4h5a1.5 1.5 0 0 0 1.5-1.4L17 7" />
          </svg>
        </button>
      </div>
      {error ? (
        <p role="alert" className="todo__error">
          {error}
        </p>
      ) : null}
    </li>
  );
}
