"use client";

import { useEffect, useState } from "react";
import type { Todo } from "@/lib/pocketbase";
import { listTodos } from "@/lib/todos";
import AddTodoForm from "./AddTodoForm";
import TodoList from "./TodoList";

type Status = "loading" | "error" | "ready";

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

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

  let content: React.ReactNode;
  if (status === "loading") {
    content = (
      <p className="status" role="status">
        Loading todos…
      </p>
    );
  } else if (status === "error") {
    content = (
      <p className="error" role="alert">
        Could not load todos: {error}
      </p>
    );
  } else {
    content = <TodoList todos={todos} onChanged={handleChanged} />;
  }

  return (
    <>
      <AddTodoForm onAdded={handleAdded} />
      {content}
    </>
  );
}
