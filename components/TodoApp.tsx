'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  createTodo,
  deleteTodo,
  listTodos,
  updateTodo,
  type Todo,
} from '@/lib/todos';
import { validateTitle } from '@/lib/validation';
import { TodoItem } from './TodoItem';

export function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    listTodos()
      .then((items) => {
        if (active) setTodos(items);
      })
      .catch(() => {
        if (active) setError('Could not load todos');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateTitle(title);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    try {
      const created = await createTodo(result.value);
      setTodos((prev) => [...prev, created]);
      setTitle('');
      setError(null);
    } catch {
      setError('Could not add todo');
    }
  }

  async function handleToggle(todo: Todo) {
    try {
      const updated = await updateTodo(todo.id, { completed: !todo.completed });
      setTodos((prev) => prev.map((item) => (item.id === todo.id ? updated : item)));
    } catch {
      setError('Could not update todo');
    }
  }

  async function handleUpdateTitle(todo: Todo, nextTitle: string) {
    const result = validateTitle(nextTitle);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    try {
      const updated = await updateTodo(todo.id, { title: result.value });
      setTodos((prev) => prev.map((item) => (item.id === todo.id ? updated : item)));
      setError(null);
    } catch {
      setError('Could not update todo');
    }
  }

  async function handleDelete(todo: Todo) {
    try {
      await deleteTodo(todo.id);
      setTodos((prev) => prev.filter((item) => item.id !== todo.id));
    } catch {
      setError('Could not delete todo');
    }
  }

  return (
    <section>
      <form onSubmit={handleAdd}>
        <label htmlFor="new-todo">New todo</label>
        <input
          id="new-todo"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <button type="submit">Add</button>
      </form>

      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p>Loading…</p>
      ) : todos.length === 0 ? (
        <p>No todos yet.</p>
      ) : (
        <ul>
          {todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={handleToggle}
              onUpdateTitle={handleUpdateTitle}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
