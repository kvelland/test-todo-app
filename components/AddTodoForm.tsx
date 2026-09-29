"use client";

import { useState } from "react";

import type { Todo } from "@/lib/pocketbase";
import { createTodo } from "@/lib/todos";
import {
  TODO_DESCRIPTION_COUNTER_THRESHOLD,
  TODO_DESCRIPTION_MAX_LENGTH,
  TODO_TITLE_MAX_LENGTH,
  validateTodoDescription,
  validateTodoTitle,
} from "@/lib/validation";

type AddTodoFormProps = {
  /** Called with the created todo so the list can insert it without a reload. */
  onAdded?: (todo: Todo) => void;
};

export default function AddTodoForm({ onAdded }: AddTodoFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showDescription, setShowDescription] = useState(false);
  // Creates run concurrently: the input clears as soon as a todo is submitted
  // so the user can type the next one straight away.
  const [pending, setPending] = useState(0);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const titleValidation = validateTodoTitle(title);
    if (!titleValidation.ok) {
      setError(titleValidation.error);
      return;
    }

    const descriptionValidation = validateTodoDescription(description);
    if (!descriptionValidation.ok) {
      setError(descriptionValidation.error);
      return;
    }

    setError(null);
    setTitle("");
    setDescription("");
    setPending((count) => count + 1);

    const result = await createTodo(titleValidation.value, descriptionValidation.value);

    setPending((count) => count - 1);

    if (!result.ok) {
      setError(result.error);
      // Give the text back unless the user has already started a new todo.
      setTitle((current) => (current === "" ? titleValidation.value : current));
      setDescription((current) => (current === "" ? descriptionValidation.value : current));
      return;
    }

    onAdded?.(result.data);
  }

  return (
    <form
      className={`add-todo${showDescription ? " add-todo--open" : ""}`}
      onSubmit={handleSubmit}
      noValidate
    >
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
      <button
        type="button"
        className="add-todo__desc-toggle text-button"
        aria-expanded={showDescription}
        onClick={() => setShowDescription((open) => !open)}
      >
        {showDescription ? "Hide description" : "Add description"}
      </button>
      <button type="submit" className="add-todo__button">
        <span className="add-todo__label">{pending > 0 ? "Adding…" : "Add"}</span>
      </button>
      {showDescription ? (
        <div className="add-todo__desc">
          <textarea
            className="add-todo__desc-input"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional details…"
            aria-label="New todo description"
            maxLength={TODO_DESCRIPTION_MAX_LENGTH}
          />
          {description.length >= TODO_DESCRIPTION_COUNTER_THRESHOLD ? (
            <span className="add-todo__desc-count">
              {description.length}/{TODO_DESCRIPTION_MAX_LENGTH}
            </span>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="add-todo__error">
          {error}
        </p>
      ) : null}
    </form>
  );
}
