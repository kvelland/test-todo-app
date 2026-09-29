# test-todo-app

A simple todo app built with [Next.js](https://nextjs.org) (App Router) and TypeScript, backed by
[PocketBase](https://pocketbase.io/).

## Prerequisites

- [Node.js](https://nodejs.org) 18.18 or newer (Node 20+ recommended)
- npm (the lockfile is `package-lock.json`)
- `curl` (used by the PocketBase download script and by `scripts/verify-todos.sh`; `wget` also works for the download)
- `unzip`
- macOS or Linux (amd64 / arm64 / armv7) for the PocketBase binary

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

Start PocketBase (see below) and then the Next.js dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

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

## PocketBase

### Setup

Download the pinned PocketBase binary (v0.40.4 by default) into the repo root:

```sh
./scripts/download-pocketbase.sh
```

The script is idempotent — it is a no-op once the correct version is present. Override the
version with `PB_VERSION=0.40.4 ./scripts/download-pocketbase.sh`.

### Run

```sh
./pocketbase serve
```

- REST API: <http://127.0.0.1:8090/api/>
- Admin dashboard: <http://127.0.0.1:8090/_/>

On first run PocketBase creates `pb_data/` (gitignored) and applies the migrations in
`pb_migrations/`, so the `todos` collection exists with no manual admin steps. Add future schema
changes as new migrations in `pb_migrations/` with a **larger** numeric prefix (Unix seconds) than
the existing file.

### Schema — `todos`

| Field       | Type       | Rules                       |
| ----------- | ---------- | --------------------------- |
| `id`        | text       | system, auto-generated      |
| `title`     | text       | required, max 200 chars     |
| `completed` | bool       | default `false`             |
| `created`   | autodate   | set on create               |
| `updated`   | autodate   | set on create and update    |

API rules for `todos` are currently **public** (empty rules): list, view, create, update, and
delete all work without authentication — this is a single-user setup for now. Authentication is a
later round; do not treat the open rules as final.

### REST API

Create a record:

```sh
curl -X POST http://127.0.0.1:8090/api/collections/todos/records \
  -H 'Content-Type: application/json' \
  -d '{"title":"Buy milk"}'
```

List records:

```sh
curl http://127.0.0.1:8090/api/collections/todos/records
```

### Verify

Run the end-to-end check against a throwaway data directory (boots PocketBase on port 8099,
creates and reads a record, asserts the response shape, then cleans up):

```sh
./scripts/verify-todos.sh
```
