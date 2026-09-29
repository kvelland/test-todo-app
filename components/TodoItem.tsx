import type { Todo } from "@/lib/pocketbase";

type TodoItemProps = {
  todo: Todo;
};

export default function TodoItem({ todo }: TodoItemProps) {
  return (
    <li className={todo.completed ? "todo todo--completed" : "todo"}>
      <span className="todo__title">{todo.title}</span>
    </li>
  );
}
