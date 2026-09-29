# test-todo-app

A small single-user todo app built with Next.js (App Router) and TypeScript, backed by PocketBase.

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app expects a PocketBase instance at `NEXT_PUBLIC_POCKETBASE_URL`
(defaults to `http://127.0.0.1:8090`) with a `todos` collection.

## Scripts

- `npm run dev` – start the development server
- `npm run build` – production build
- `npm start` – run the production build
- `npm run lint` – ESLint via `next lint`
- `npm run typecheck` – TypeScript type checking (`tsc --noEmit`)
- `npm test` – run the Vitest suite once
- `npm run test:watch` – run Vitest in watch mode

## Tests

Unit and component tests use [Vitest](https://vitest.dev) and
[React Testing Library](https://testing-library.com/docs/react-testing-library/intro/).
The data layer in `lib/todos.ts` is mocked in component tests, so no running
PocketBase instance is needed. Tests live next to the code as `*.test.ts(x)`.

## CI

`.github/workflows/ci.yml` runs lint, typecheck, test, and build on every push
and pull request.
