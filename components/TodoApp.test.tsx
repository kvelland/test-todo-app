import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TodoApp } from './TodoApp';
import * as todos from '@/lib/todos';
import type { Todo } from '@/lib/todos';

vi.mock('@/lib/todos', () => ({
  listTodos: vi.fn(),
  createTodo: vi.fn(),
  updateTodo: vi.fn(),
  deleteTodo: vi.fn(),
}));

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: '1',
    title: 'Buy milk',
    completed: false,
    created: '2024-01-01T00:00:00.000Z',
    updated: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TodoApp', () => {
  it('renders the todos returned by the data layer', async () => {
    vi.mocked(todos.listTodos).mockResolvedValue([makeTodo()]);

    render(<TodoApp />);

    expect(await screen.findByText('Buy milk')).toBeInTheDocument();
  });

  it('adds a todo through the data layer', async () => {
    const user = userEvent.setup();
    vi.mocked(todos.listTodos).mockResolvedValue([]);
    vi.mocked(todos.createTodo).mockResolvedValue(makeTodo({ id: '2', title: 'Write tests' }));

    render(<TodoApp />);

    await user.type(await screen.findByLabelText('New todo'), 'Write tests');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(todos.createTodo).toHaveBeenCalledWith('Write tests');
    expect(await screen.findByText('Write tests')).toBeInTheDocument();
  });

  it('toggles a todo through the data layer', async () => {
    const user = userEvent.setup();
    vi.mocked(todos.listTodos).mockResolvedValue([makeTodo()]);
    vi.mocked(todos.updateTodo).mockResolvedValue(makeTodo({ completed: true }));

    render(<TodoApp />);

    await user.click(await screen.findByLabelText('Toggle Buy milk'));

    await waitFor(() =>
      expect(todos.updateTodo).toHaveBeenCalledWith('1', { completed: true }),
    );
    expect(screen.getByLabelText('Toggle Buy milk')).toBeChecked();
  });

  it("edits a todo's title through the data layer", async () => {
    const user = userEvent.setup();
    vi.mocked(todos.listTodos).mockResolvedValue([makeTodo()]);
    vi.mocked(todos.updateTodo).mockResolvedValue(makeTodo({ title: 'Buy oat milk' }));

    render(<TodoApp />);

    await user.click(await screen.findByRole('button', { name: 'Edit' }));
    const input = screen.getByLabelText('Edit title');
    await user.clear(input);
    await user.type(input, 'Buy oat milk');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(todos.updateTodo).toHaveBeenCalledWith('1', { title: 'Buy oat milk' }),
    );
    expect(await screen.findByText('Buy oat milk')).toBeInTheDocument();
  });

  it('deletes a todo through the data layer', async () => {
    const user = userEvent.setup();
    vi.mocked(todos.listTodos).mockResolvedValue([makeTodo()]);
    vi.mocked(todos.deleteTodo).mockResolvedValue(undefined);

    render(<TodoApp />);

    await user.click(await screen.findByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(todos.deleteTodo).toHaveBeenCalledWith('1'));
    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument();
  });

  it('shows a validation error and does not call the data layer for an empty title', async () => {
    const user = userEvent.setup();
    vi.mocked(todos.listTodos).mockResolvedValue([]);

    render(<TodoApp />);

    await user.click(await screen.findByRole('button', { name: 'Add' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Title is required');
    expect(todos.createTodo).not.toHaveBeenCalled();
  });
});
