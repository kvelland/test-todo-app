"use client";

import { useEffect, useSyncExternalStore, useState } from "react";
import type { Todo } from "@/lib/pocketbase";
import {
  getServerSort,
  getStoredSort,
  setStoredSort,
  sortTodos,
  subscribeToSort,
} from "@/lib/sort";
import { listTodos } from "@/lib/todos";
import AddTodoForm from "./AddTodoForm";
import SortControl from "./SortControl";
import TodoList from "./TodoList";

type Status = "loading" | "error" | "ready";

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  // Read from storage as an external store so the server and the first client
  // render agree, then the remembered choice takes over after hydration.
  const sort = useSyncExternalStore(subscribeToSort, getStoredSort, getServerSort);

  useEffect(() => {
    let active = true;

    (async () => {
      const result = await listTodos();
      if (!active) return;

      if (result.ok) {
        setTodos(result.data);
        setStatus("ready");
      } else {
        setError(result.error);
        setStatus("error");
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  function handleAdded(todo: Todo) {
    setTodos((current) => [todo, ...current]);
  }

  function handleChanged(updated: Todo) {
    setTodos((current) => current.map((todo) => (todo.id === updated.id ? updated : todo)));
  }

  function handleDeleted(id: string) {
    setTodos((current) => current.filter((todo) => todo.id !== id));
  }

  const total = todos.length;
  const done = todos.filter((todo) => todo.completed).length;

  let content: React.ReactNode;
  if (status === "loading") {
    content = (
      <div className="loading">
        <p className="sr-only" role="status">
          Loading todos…
        </p>
        {[0, 1, 2].map((row) => (
          <div key={row} className="skeleton" style={{ "--i": row } as React.CSSProperties} />
        ))}
      </div>
    );
  } else if (status === "error") {
    content = (
      <p className="banner banner--error" role="alert">
        Could not load todos: {error}
      </p>
    );
  } else {
    content = (
      <>
        {total > 0 ? (
          <div className="list-header">
            <div className="progress">
              <p className="progress__label">
                {done === total ? (
                  <>All done — lovely work.</>
                ) : (
                  <>
                    <strong>{done}</strong> of <strong>{total}</strong> done
                  </>
                )}
              </p>
              <div className="progress__track" aria-hidden="true">
                <div
                  className="progress__fill"
                  style={{ transform: `scaleX(${total ? done / total : 0})` }}
                />
              </div>
            </div>
            <SortControl value={sort} onChange={setStoredSort} />
          </div>
        ) : null}
        <TodoList
          todos={sortTodos(todos, sort)}
          onChanged={handleChanged}
          onDeleted={handleDeleted}
        />
      </>
    );
  }

  return (
    <>
      <AddTodoForm onAdded={handleAdded} />
      {content}
    </>
  );
}
