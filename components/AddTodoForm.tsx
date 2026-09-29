"use client";

import { useState } from "react";

import type { Todo } from "@/lib/pocketbase";
import { createTodo } from "@/lib/todos";
import { TODO_TITLE_MAX_LENGTH, validateDeadline, validateTodoTitle } from "@/lib/validation";

type AddTodoFormProps = {
  /** Called with the created todo so the list can insert it without a reload. */
  onAdded?: (todo: Todo) => void;
};

export default function AddTodoForm({ onAdded }: AddTodoFormProps) {
  const [title, setTitle] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Creates run concurrently: the input clears as soon as a todo is submitted
  // so the user can type the next one straight away.
  const [pending, setPending] = useState(0);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const titleCheck = validateTodoTitle(title);
    if (!titleCheck.ok) {
      setError(titleCheck.error);
      return;
    }

    const deadlineCheck = validateDeadline({ date: deadlineDate, time: deadlineTime });
    if (!deadlineCheck.ok) {
      setError(deadlineCheck.error);
      return;
    }

    setError(null);
    setTitle("");
    setDeadlineDate("");
    setDeadlineTime("");
    setPending((count) => count + 1);

    const result = await createTodo(titleCheck.value, deadlineCheck.value);

    setPending((count) => count - 1);

    if (!result.ok) {
      setError(result.error);
      // Give the values back unless the user has already started a new todo.
      setTitle((current) => (current === "" ? titleCheck.value : current));
      setDeadlineDate((current) => (current === "" ? deadlineDate : current));
      setDeadlineTime((current) => (current === "" ? deadlineTime : current));
      return;
    }

    onAdded?.(result.data);
  }

  return (
    <form className="add-todo" onSubmit={handleSubmit} noValidate>
      <div className="add-todo__bar">
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
      </div>
      <div className="add-todo__deadline">
        <span className="add-todo__field">
          <span className="add-todo__field-label">Deadline</span>
          <input
            type="date"
            className="add-todo__date"
            value={deadlineDate}
            onChange={(event) => setDeadlineDate(event.target.value)}
            aria-label="Deadline date"
          />
        </span>
        <span className="add-todo__field">
          <span className="add-todo__field-label">Time</span>
          <input
            type="time"
            className="add-todo__time"
            value={deadlineTime}
            onChange={(event) => setDeadlineTime(event.target.value)}
            aria-label="Deadline time"
          />
        </span>
        <span className="add-todo__hint">Optional — leave the time blank for end of day</span>
      </div>
      {error ? (
        <p role="alert" className="add-todo__error">
          {error}
        </p>
      ) : null}
    </form>
  );
}
