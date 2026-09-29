# test-todo-app

A simple todo app built with [Next.js](https://nextjs.org) (App Router) and TypeScript.

> This is the base project scaffold; todo functionality is not implemented yet.

## Prerequisites

- [Node.js](https://nodejs.org) 18.18 or newer (Node 20+ recommended)
- npm (the lockfile is `package-lock.json`)

## Install

```bash
npm install
```

## Environment

Copy the example environment file and adjust values as needed:

```bash
cp .env.example .env.local
```

| Variable                     | Description                         | Default                 |
| ---------------------------- | ----------------------------------- | ----------------------- |
| `NEXT_PUBLIC_POCKETBASE_URL` | Base URL of the PocketBase backend. | `http://127.0.0.1:8090` |

`.env.local` is git-ignored; commit new variables to `.env.example` instead.

## Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the "Todos" placeholder page.

## Scripts

| Script                 | Description                     |
| ---------------------- | ------------------------------- |
| `npm run dev`          | Start the development server.   |
| `npm run build`        | Create a production build.      |
| `npm run start`        | Serve the production build.     |
| `npm run lint`         | Run ESLint.                     |
| `npm run typecheck`    | Type-check with `tsc --noEmit`. |
| `npm run format`       | Format files with Prettier.     |
| `npm run format:check` | Check formatting with Prettier. |
