'use client';

import { useState } from 'react';
import type { Todo } from '@/lib/todos';

type TodoItemProps = {
  todo: Todo;
  onToggle: (todo: Todo) => void;
  onUpdateTitle: (todo: Todo, title: string) => void;
  onDelete: (todo: Todo) => void;
};

export function TodoItem({ todo, onToggle, onUpdateTitle, onDelete }: TodoItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);

  function startEditing() {
    setDraft(todo.title);
    setEditing(true);
  }

  function save() {
    onUpdateTitle(todo, draft);
    setEditing(false);
  }

  function cancel() {
    setDraft(todo.title);
    setEditing(false);
  }

  return (
    <li>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo)}
        aria-label={`Toggle ${todo.title}`}
      />

      {editing ? (
        <>
          <input
            aria-label="Edit title"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="button" onClick={save}>
            Save
          </button>
          <button type="button" onClick={cancel}>
            Cancel
          </button>
        </>
      ) : (
        <>
          <span>{todo.title}</span>
          <button type="button" onClick={startEditing}>
            Edit
          </button>
          <button type="button" onClick={() => onDelete(todo)}>
            Delete
          </button>
        </>
      )}
    </li>
  );
}
