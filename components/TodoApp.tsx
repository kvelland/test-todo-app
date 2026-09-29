"use client";

import { useEffect, useState } from "react";
import type { Tag, Todo } from "@/lib/pocketbase";
import { listTags, listTodos } from "@/lib/todos";
import AddTodoForm from "./AddTodoForm";
import TagFilter from "./TagFilter";
import TodoList from "./TodoList";

type Status = "loading" | "error" | "ready";

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      const [todosResult, tagsResult] = await Promise.all([listTodos(), listTags()]);
      if (!active) return;

      if (!todosResult.ok) {
        setError(todosResult.error);
        setStatus("error");
      } else if (!tagsResult.ok) {
        setError(tagsResult.error);
        setStatus("error");
      } else {
        setTodos(todosResult.data);
        setTags(tagsResult.data);
        setStatus("ready");
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

  function handleTagCreated(tag: Tag) {
    setTags((current) =>
      current.some((existing) => existing.id === tag.id)
        ? current
        : [...current, tag].sort((a, b) => a.name.localeCompare(b.name)),
    );
  }

  function handleToggleTag(tagId: string) {
    setSelectedTagIds((current) =>
      current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId],
    );
  }

  const total = todos.length;
  const done = todos.filter((todo) => todo.completed).length;

  const visibleTodos =
    selectedTagIds.length === 0
      ? todos
      : todos.filter((todo) => todo.tags.some((id) => selectedTagIds.includes(id)));

  // Only the filtered view gets the "no matches" wording; an empty list is still "No todos yet".
  const filteredEmpty = selectedTagIds.length > 0 && total > 0;

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
        ) : null}
        <TagFilter
          tags={tags}
          selectedIds={selectedTagIds}
          onToggle={handleToggleTag}
          onClear={() => setSelectedTagIds([])}
        />
        <TodoList
          todos={visibleTodos}
          onChanged={handleChanged}
          onDeleted={handleDeleted}
          availableTags={tags}
          onTagCreated={handleTagCreated}
          onFilterTag={handleToggleTag}
          emptyTitle={filteredEmpty ? "No todos match these tags" : undefined}
          emptyHint={filteredEmpty ? "Try a different tag or clear the filter." : undefined}
        />
      </>
    );
  }

  return (
    <>
      <AddTodoForm onAdded={handleAdded} availableTags={tags} onTagCreated={handleTagCreated} />
      {content}
    </>
  );
}
