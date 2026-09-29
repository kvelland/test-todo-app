"use client";

import { useState } from "react";
import type { Todo } from "@/lib/pocketbase";
import { updateTodo } from "@/lib/todos";

type TodoItemProps = {
  todo: Todo;
  onChanged: (todo: Todo) => void;
};

export default function TodoItem({ todo, onChanged }: TodoItemProps) {
  // Optimistic value shown while a toggle is in flight; null means "use todo.completed".
  const [optimisticCompleted, setOptimisticCompleted] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      {error ? (
        <span role="alert" className="todo__error">
          {error}
        </span>
      ) : null}
    </li>
  );
}
