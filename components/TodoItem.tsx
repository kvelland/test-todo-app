"use client";

import { useRef, useState } from "react";
import { deadlineState, formatDeadline, splitDeadline } from "@/lib/deadline";
import type { Tag, Todo } from "@/lib/pocketbase";
import { deleteTodo, updateTodo } from "@/lib/todos";
import { TODO_TITLE_MAX_LENGTH, validateDeadline, validateTodoTitle } from "@/lib/validation";
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
  const [optimisticDeadline, setOptimisticDeadline] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [draft, setDraft] = useState(todo.title);
  const [draftDate, setDraftDate] = useState("");
  const [draftTime, setDraftTime] = useState("");
  // Guards against Enter/Escape and the blur that follows both committing.
  const committedRef = useRef(false);

  const completed = optimisticCompleted ?? todo.completed;
  const title = optimisticTitle ?? todo.title;
  const deadline = optimisticDeadline ?? todo.deadline;
  const toggling = optimisticCompleted !== null;
  const tagIds = optimisticTags ?? todo.tags;
  const todoTags = availableTags.filter((tag) => tagIds.includes(tag.id));

  const state = deadline ? deadlineState(deadline, new Date()) : "none";
  // Completed todos show their deadline but are never marked overdue.
  const overdue = state === "overdue" && !completed;

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
    // Seed from the shown values (optimistic when a save is still in flight) so
    // reopening the editor never resurrects a deadline the user just replaced.
    const split = splitDeadline(deadline);
    setDraft(title);
    setDraftDate(split?.date ?? "");
    setDraftTime(split?.time ?? "");
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

    const titleCheck = validateTodoTitle(draft);
    if (!titleCheck.ok) {
      // Stay in edit mode so the user can correct the title.
      setError(titleCheck.error);
      return;
    }

    const deadlineCheck = validateDeadline({ date: draftDate, time: draftTime });
    if (!deadlineCheck.ok) {
      // Stay in edit mode so the user can correct the deadline.
      setError(deadlineCheck.error);
      return;
    }

    committedRef.current = true;
    setEditing(false);
    setError(null);

    const nextDeadline = deadlineCheck.value ?? "";
    const patch: Partial<Pick<Todo, "title" | "deadline">> = {};
    if (titleCheck.value !== todo.title) patch.title = titleCheck.value;
    if (nextDeadline !== todo.deadline) patch.deadline = nextDeadline;
    if (patch.title === undefined && patch.deadline === undefined) return;

    if (patch.title !== undefined) setOptimisticTitle(patch.title);
    if (patch.deadline !== undefined) setOptimisticDeadline(patch.deadline);

    const result = await updateTodo(todo.id, patch);

    setOptimisticTitle(null);
    setOptimisticDeadline(null);

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

  // Save once focus leaves the whole edit block (title or either deadline field),
  // not when it merely moves between them.
  function handleEditBlur(event: React.FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      void saveEdit();
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

  const dueClassName = [
    "todo__due",
    overdue && "todo__due--overdue",
    !overdue && state === "today" && "todo__due--today",
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
          <div className="todo__edit-fields" onBlur={handleEditBlur}>
            <input
              type="text"
              className="todo__edit"
              // Focus moves here as the direct result of the user asking to edit.
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={TODO_TITLE_MAX_LENGTH}
              aria-label="Edit todo title"
            />
            <span className="todo__edit-deadline">
              <input
                type="date"
                className="todo__edit-date"
                value={draftDate}
                onChange={(event) => setDraftDate(event.target.value)}
                onKeyDown={handleKeyDown}
                aria-label="Edit deadline date"
              />
              <input
                type="time"
                className="todo__edit-time"
                value={draftTime}
                onChange={(event) => setDraftTime(event.target.value)}
                onKeyDown={handleKeyDown}
                aria-label="Edit deadline time"
              />
            </span>
          </div>
        ) : (
          <>
            <span className="todo__title" onDoubleClick={startEdit}>
              {title}
            </span>
            {deadline ? (
              <span className={dueClassName}>
                <span className="todo__due-date">{formatDeadline(deadline)}</span>
                {overdue ? <span className="todo__due-flag">Overdue</span> : null}
              </span>
            ) : null}
          </>
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
