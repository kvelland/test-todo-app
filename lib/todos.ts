import { pb } from './pocketbase';

export type Todo = {
  id: string;
  title: string;
  completed: boolean;
  created: string;
  updated: string;
};

export type TodoPatch = Partial<Pick<Todo, 'title' | 'completed'>>;

const COLLECTION = 'todos';

export async function listTodos(): Promise<Todo[]> {
  return pb.collection(COLLECTION).getFullList<Todo>({ sort: '-created' });
}

export async function createTodo(title: string): Promise<Todo> {
  return pb.collection(COLLECTION).create<Todo>({ title, completed: false });
}

export async function updateTodo(id: string, patch: TodoPatch): Promise<Todo> {
  return pb.collection(COLLECTION).update<Todo>(id, patch);
}

export async function deleteTodo(id: string): Promise<void> {
  await pb.collection(COLLECTION).delete(id);
}
