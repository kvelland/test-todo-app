"use client";

import { useEffect, useState } from "react";
import type { Todo } from "@/lib/pocketbase";
import { listTodos } from "@/lib/todos";
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

  if (status === "loading") {
    return (
      <p className="status" role="status">
        Loading todos…
      </p>
    );
  }

  if (status === "error") {
    return (
      <p className="error" role="alert">
        Could not load todos: {error}
      </p>
    );
  }

  return <TodoList todos={todos} />;
}
