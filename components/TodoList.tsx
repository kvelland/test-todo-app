import type { Todo } from "@/lib/pocketbase";
import TodoItem from "./TodoItem";

type TodoListProps = {
  todos: Todo[];
  onChanged: (todo: Todo) => void;
  onDeleted: (id: string) => void;
};

export default function TodoList({ todos, onChanged, onDeleted }: TodoListProps) {
  if (todos.length === 0) {
    return (
      <div className="empty">
        <svg className="empty__art" viewBox="0 0 120 120" aria-hidden="true">
          <circle className="empty__sun" cx="60" cy="54" r="22" />
          <path
            className="empty__hill empty__hill--back"
            d="M4 104c22-26 46-34 70-24s32 14 42 24z"
          />
          <path className="empty__hill" d="M0 108c24-18 44-22 64-14s34 10 56 14v12H0z" />
        </svg>
        <p className="empty__title">No todos yet</p>
        <p className="empty__hint">A clear day. Add something above when you&apos;re ready.</p>
      </div>
    );
  }

  return (
    <ul className="todo-list">
      {todos.map((todo, index) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          index={index}
          onChanged={onChanged}
          onDeleted={onDeleted}
        />
      ))}
    </ul>
  );
}
