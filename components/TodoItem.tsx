"use client";

import { useState } from "react";
import type { Todo } from "@/lib/pocketbase";
import { deleteTodo, updateTodo } from "@/lib/todos";

type TodoItemProps = {
  todo: Todo;
  onChanged: (todo: Todo) => void;
  onDeleted: (id: string) => void;
};

export default function TodoItem({ todo, onChanged, onDeleted }: TodoItemProps) {
  // Optimistic value shown while a toggle is in flight; null means "use todo.completed".
  const [optimisticCompleted, setOptimisticCompleted] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const completed = optimisticCompleted ?? todo.completed;
  const pending = optimisticCompleted !== null;

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

  return (
    <li className={completed ? "todo todo--completed" : "todo"}>
      <input
        type="checkbox"
        checked={completed}
        onChange={handleToggle}
        disabled={pending}
        aria-label={`Mark "${todo.title}" as ${completed ? "not complete" : "complete"}`}
      />
      <span className="todo__title">{todo.title}</span>
      <button
        type="button"
        className="todo__delete"
        onClick={handleDelete}
        disabled={deleting}
        aria-label={`Delete "${todo.title}"`}
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
