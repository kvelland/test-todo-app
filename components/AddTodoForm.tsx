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
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) {
      return;
    }

    const validation = validateTodoTitle(title);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    setSaving(true);
    setError(null);

    const result = await createTodo(validation.value);

    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setTitle("");
    onAdded?.(result.data);
  }

  return (
    <form className="add-todo" onSubmit={handleSubmit} noValidate>
      <input
        type="text"
        className="add-todo__input"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Add a todo"
        aria-label="New todo title"
        maxLength={TODO_TITLE_MAX_LENGTH}
        disabled={saving}
      />
      <button type="submit" className="add-todo__button" disabled={saving}>
        {saving ? "Adding…" : "Add"}
      </button>
      {error ? (
        <p role="alert" className="add-todo__error">
          {error}
        </p>
      ) : null}
    </form>
  );
}
