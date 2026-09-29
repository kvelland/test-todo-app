"use client";

import { useState } from "react";

import type { Tag, Todo } from "@/lib/pocketbase";
import { createTodo } from "@/lib/todos";
import {
  TODO_DESCRIPTION_COUNTER_THRESHOLD,
  TODO_DESCRIPTION_MAX_LENGTH,
  TODO_TITLE_MAX_LENGTH,
  validateDeadline,
  validateTodoDescription,
  validateTodoTitle,
} from "@/lib/validation";
import TagInput from "./TagInput";

type AddTodoFormProps = {
  /** Called with the created todo so the list can insert it without a reload. */
  onAdded?: (todo: Todo) => void;
  availableTags?: Tag[];
  /** Called when the user creates a brand new tag, so the app can keep its list. */
  onTagCreated?: (tag: Tag) => void;
};

export default function AddTodoForm({
  onAdded,
  availableTags = [],
  onTagCreated,
}: AddTodoFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showDescription, setShowDescription] = useState(false);
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

    const descriptionCheck = validateTodoDescription(description);
    if (!descriptionCheck.ok) {
      setError(descriptionCheck.error);
      return;
    }

    const deadlineCheck = validateDeadline({ date: deadlineDate, time: deadlineTime });
    if (!deadlineCheck.ok) {
      setError(deadlineCheck.error);
      return;
    }

    setError(null);
    setTitle("");
    setDescription("");
    setTags([]);
    setDeadlineDate("");
    setDeadlineTime("");
    setPending((count) => count + 1);

    const result = await createTodo(
      titleCheck.value,
      deadlineCheck.value,
      tags.map((tag) => tag.id),
      descriptionCheck.value,
    );

    setPending((count) => count - 1);

    if (!result.ok) {
      setError(result.error);
      // Give the values back unless the user has already started a new todo.
      setTitle((current) => (current === "" ? titleCheck.value : current));
      setDescription((current) => (current === "" ? descriptionCheck.value : current));
      setDeadlineDate((current) => (current === "" ? deadlineDate : current));
      setDeadlineTime((current) => (current === "" ? deadlineTime : current));
      return;
    }

    onAdded?.(result.data);
  }

  return (
    <form className="add-todo" onSubmit={handleSubmit} noValidate>
      <div className={`add-todo__bar${showDescription ? " add-todo__bar--open" : ""}`}>
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
      <TagInput
        label="Tags"
        selected={tags}
        availableTags={availableTags}
        onChange={setTags}
        onCreated={onTagCreated}
      />
      {error ? (
        <p role="alert" className="add-todo__error">
          {error}
        </p>
      ) : null}
    </form>
  );
}
