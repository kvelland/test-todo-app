"use client";

import { useState } from "react";

import type { Todo } from "@/lib/pocketbase";
import { createTodo } from "@/lib/todos";
import { TODO_TITLE_MAX_LENGTH, validateTodoTitle } from "@/lib/validation";

type AddTodoFormProps = {
  /** Called with the created todo so the list can insert it without a reload. */
  onAdded?: (todo: Todo) => void;
};

export default function AddTodoForm({ onAdded }: AddTodoFormProps) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Creates run concurrently: the input clears as soon as a todo is submitted
  // so the user can type the next one straight away.
  const [pending, setPending] = useState(0);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validation = validateTodoTitle(title);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    setError(null);
    setTitle("");
    setPending((count) => count + 1);

    const result = await createTodo(validation.value);

    setPending((count) => count - 1);

    if (!result.ok) {
      setError(result.error);
      // Give the text back unless the user has already started a new todo.
      setTitle((current) => (current === "" ? validation.value : current));
      return;
    }

    onAdded?.(result.data);
  }

  return (
    <form className="add-todo" onSubmit={handleSubmit} noValidate>
      <span className="add-todo__plus" aria-hidden="true" />
      <input
        type="text"
        className="add-todo__input"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="What needs doing?"
        aria-label="New todo title"
        maxLength={TODO_TITLE_MAX_LENGTH}
      />
      <button type="submit" className="add-todo__button">
        <span className="add-todo__label">{pending > 0 ? "Adding…" : "Add"}</span>
      </button>
      {error ? (
        <p role="alert" className="add-todo__error">
          {error}
        </p>
      ) : null}
    </form>
  );
}
