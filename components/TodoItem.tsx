"use client";

import { useRef, useState } from "react";
import type { Todo } from "@/lib/pocketbase";
import { deleteTodo, updateTodo } from "@/lib/todos";
import { TODO_TITLE_MAX_LENGTH, validateTodoTitle } from "@/lib/validation";

type TodoItemProps = {
  todo: Todo;
  onChanged: (todo: Todo) => void;
  onDeleted: (id: string) => void;
};

export default function TodoItem({ todo, onChanged, onDeleted }: TodoItemProps) {
  // Optimistic values shown while a save is in flight; null means "use the saved todo".
  const [optimisticCompleted, setOptimisticCompleted] = useState<boolean | null>(null);
  const [optimisticTitle, setOptimisticTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);
  // Guards against Enter/Escape and the blur that follows both committing.
  const committedRef = useRef(false);

  const completed = optimisticCompleted ?? todo.completed;
  const title = optimisticTitle ?? todo.title;
  const toggling = optimisticCompleted !== null;

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
      onDeleted(todo.id);
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

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void saveEdit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
    }
  }

  return (
    <li className={completed ? "todo todo--completed" : "todo"}>
      <input
        type="checkbox"
        checked={completed}
        onChange={handleToggle}
        disabled={toggling}
        aria-label={`Mark "${title}" as ${completed ? "not complete" : "complete"}`}
      />
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
        <>
          <span className="todo__title" onDoubleClick={startEdit}>
            {title}
          </span>
          <button
            type="button"
            className="todo__action"
            onClick={startEdit}
            aria-label={`Edit "${title}"`}
          >
            Edit
          </button>
        </>
      )}
      <button
        type="button"
        className="todo__action todo__delete"
        onClick={handleDelete}
        disabled={deleting}
        aria-label={`Delete "${title}"`}
      >
        {deleting ? "Deleting…" : "Delete"}
      </button>
      {error ? (
        <span role="alert" className="todo__error">
          {error}
        </span>
      ) : null}
    </li>
  );
}
