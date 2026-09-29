import type { Todo } from "@/lib/pocketbase";
import TodoItem from "./TodoItem";

type TodoListProps = {
  todos: Todo[];
  onChanged: (todo: Todo) => void;
  onDeleted: (id: string) => void;
};

export default function TodoList({ todos, onChanged, onDeleted }: TodoListProps) {
  if (todos.length === 0) {
    return <p className="status">No todos yet</p>;
  }

  return (
    <ul className="todo-list">
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} onChanged={onChanged} onDeleted={onDeleted} />
      ))}
    </ul>
  );
}
