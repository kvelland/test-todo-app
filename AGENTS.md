<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Agent guide — test-todo-app

A todo app: Next.js 16 (App Router) + TypeScript + React 19 on the front end, PocketBase
v0.40.4 as the backend. Read this whole file before planning or writing code.

## Before you start

1. **Build on `main`, never re-create it.** The scaffold, PocketBase setup, data layer, test
   setup and CI already exist on `main`. Do not add another Next.js scaffold, `package.json`,
   ESLint/TS config, migration for `todos`, PocketBase client, or `lib/todos.ts`. If your issue
   seems to need them, they are already here — use them.
2. **Start from current `main`.** Before continuing work on an existing branch (including
   rework after review), bring it up to date and resolve any conflicts:

   ```sh
   git fetch origin main && git merge origin/main
   ```

3. **Check dependencies.** If your issue depends on work that is not merged to `main` yet
   (look at open PRs: `gh pr list`), stop and report the work item as blocked instead of
   re-implementing the missing piece.
4. **Keep the diff to your feature.** One issue, one focused PR. No drive-by reformatting,
   dependency bumps, or refactors outside the issue.

## Layout

| Path                             | What it is                                                          |
| -------------------------------- | ------------------------------------------------------------------- |
| `app/page.tsx`, `app/layout.tsx` | Page shell (server components). Fonts and backdrop live in layout.  |
| `app/globals.css`                | All styles. Design tokens are CSS variables on `:root`.             |
| `components/TodoApp.tsx`         | Client component that owns the todo list state.                     |
| `components/AddTodoForm.tsx`     | New-todo input.                                                     |
| `components/TodoList.tsx`        | List + empty state.                                                 |
| `components/TodoItem.tsx`        | One todo: toggle, inline edit, delete.                              |
| `lib/pocketbase.ts`              | The single PocketBase client (`pb`) and the `Todo` type.            |
| `lib/todos.ts`                   | Data layer: `listTodos`, `createTodo`, `updateTodo`, `deleteTodo`.  |
| `lib/validation.ts`              | `validateTodoTitle` — shared by add and edit.                       |
| `pb_migrations/`                 | PocketBase JS migrations (schema).                                  |
| `scripts/`                       | `download-pocketbase.sh`, `verify-todos.sh` (end-to-end API check). |
| `.github/workflows/ci.yml`       | CI. Maintainer-owned — the Factory App cannot push workflow files.  |

## Contracts — follow these

- **Data access only through `lib/todos.ts`.** Components never import `pb` or call PocketBase
  directly. Every function returns `Result<T>` and never throws:

  ```ts
  type Result<T> = { ok: true; data: T } | { ok: false; error: string };
  ```

  Branch on `result.ok`; show `result.error` to the user. Do not wrap calls in `try/catch`.
  If you need a new query, add a function to `lib/todos.ts` in the same style, with tests in
  `lib/todos.test.ts`.

- **`Todo` type** comes from `lib/pocketbase.ts`: `id`, `title`, `completed`, `created`,
  `updated`. `listTodos` returns newest first (`sort: "-created"`).
- **Titles** are validated with `validateTodoTitle` (trimmed, 1–200 chars, matching the
  PocketBase schema). Reuse it; don't write another validator.
- **Schema changes** go in a _new_ file in `pb_migrations/` with a larger Unix-seconds prefix
  than existing ones. Never edit an existing migration. Keep `down` reversible.
- **UI state:** `TodoApp` owns the list; children report changes via `onAdded` / `onChanged` /
  `onDeleted`. Updates are optimistic with revert and an inline `role="alert"` error on failure.
- **Accessibility is part of the contract** — tests select by these, so keep them stable:
  input label `New todo title`, button `Add` / `Adding…`, checkbox `Mark "<title>" as complete`,
  `Edit "<title>"`, `Delete "<title>"`, edit input `Edit todo title`, `role="status"` while
  loading, empty text `No todos yet`.
- **Styling:** plain CSS in `app/globals.css` using the existing tokens (`--accent`, `--done`,
  `--ink`, …). No Tailwind or CSS-in-JS. Light theme only. Any new animation must be covered
  by the `prefers-reduced-motion` block.

## Definition of done

A PR is ready only when **all** of these pass locally. Paste the summary lines into the PR
description.

```sh
npm ci
npm run lint
npm run format:check      # run `npm run format` to fix
npm run typecheck
npm test
npm run build
./scripts/download-pocketbase.sh && ./scripts/verify-todos.sh
```

Then **run the app and use your feature** against a real PocketBase — unit tests with mocked
data do not catch focus, timing, or wiring bugs:

```sh
./pocketbase serve &   # http://127.0.0.1:8090, applies pb_migrations automatically
npm run dev            # http://localhost:3000
```

Exercise the happy path and the failure path (e.g. stop PocketBase and confirm the error
shows). Say in the PR what you checked by hand.

**Tests:** every behaviour change gets a test. Component tests live next to the component
(`*.test.tsx`, Vitest + Testing Library, `lib/todos` mocked as in `components/TodoApp.test.tsx`).
Write the test so it fails without your change.

## Don'ts

- Don't commit `pocketbase` (the binary), `pb_data/`, `.env.local`, or `.next/`.
- Don't add dependencies without saying why in the PR.
- Don't change `.github/workflows/` — ask a maintainer in the PR instead.
- Don't disable lint rules or skip tests to get green.
