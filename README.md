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

Start PocketBase (see [PocketBase](#pocketbase) below) in one terminal:

```bash
./scripts/download-pocketbase.sh
./pocketbase serve
```

Then the Next.js dev server in another:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to list, add, complete, edit
(Edit button or double-click; Enter/blur saves, Escape cancels), and delete todos, to
set deadlines and sort the list — see [Deadlines and sorting](#deadlines-and-sorting) — and to
label todos with tags. Type into the tag field to add an existing tag or create a new one, click a
tag chip on a todo to filter by it, and use the filter bar above the list to select one or more
tags (a todo matches if it has any of them). "Clear filter" returns to the full list.

## Deadlines and sorting

Todos can have an optional deadline, and the list can be sorted by it.

- **Set a deadline** when adding a todo, or when editing an existing one (Edit button or
  double-click). Pick a date and, optionally, a time of day.
- **Time of day is optional.** Leave it blank and the deadline means the **end of that day** in
  your local time zone.
- **Deadlines are shown on each todo**, e.g. `Due 3 Oct` or `Due today 14:00`. Todos past their
  date are labelled **Overdue**; todos due today show **Due today**. Completed todos keep their
  deadline but are never marked overdue.
- Deadlines are stored in UTC and displayed in your local time zone.

The sort control above the list offers:

| Order                      | Behaviour                                             |
| -------------------------- | ----------------------------------------------------- |
| `Date created`             | Newest first (the original default).                  |
| `Deadline, earliest first` | Soonest deadline first; todos with no deadline last.  |
| `Deadline, latest first`   | Furthest deadline first; todos with no deadline last. |

Todos that share a deadline keep their newest-first creation order. The chosen sort order is
remembered in the browser (`localStorage`) and restored on reload.

## Scripts

| Script                 | Description                     |
| ---------------------- | ------------------------------- |
| `npm run dev`          | Start the development server.   |
| `npm run build`        | Create a production build.      |
| `npm run start`        | Serve the production build.     |
| `npm run lint`         | Run ESLint.                     |
| `npm run typecheck`    | Type-check with `tsc --noEmit`. |
| `npm test`             | Run the Vitest suite.           |
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

| Field       | Type     | Rules                                |
| ----------- | -------- | ------------------------------------ |
| `id`        | text     | system, auto-generated               |
| `title`     | text     | required, max 200 chars              |
| `completed` | bool     | default `false`                      |
| `deadline`  | date     | optional; empty string = no deadline |
| `tags`      | relation | zero or more `tags` records          |
| `created`   | autodate | set on create                        |
| `updated`   | autodate | set on create and update             |

### Schema — `tags`

| Field     | Type     | Rules                                |
| --------- | -------- | ------------------------------------ |
| `id`      | text     | system, auto-generated               |
| `name`    | text     | required, max 30 chars, unique index |
| `created` | autodate | set on create                        |
| `updated` | autodate | set on create and update             |

Tag names are unique **case-insensitively in the app** (`Work` and `work` are the same tag); the
database index on `name` is case-sensitive, so `createTag` in `lib/todos.ts` checks for an existing
match before inserting and returns the existing tag when one exists. Tagging is current-only: a
todo can hold any number of tags, but tags cannot be renamed or deleted yet (a separate issue).

API rules for `todos` and `tags` are currently **public** (empty rules): list, view, create, update,
and delete all work without authentication — this is a single-user setup for now. Authentication is a
later round; do not treat the open rules as final.

### REST API

Create a record (with an optional deadline; omit `deadline` or pass `""` for none):

```sh
curl -X POST http://127.0.0.1:8090/api/collections/todos/records \
  -H 'Content-Type: application/json' \
  -d '{"title":"Buy milk","deadline":"2026-10-03T21:59:59.999Z"}'
```

List records:

```sh
curl http://127.0.0.1:8090/api/collections/todos/records
```

Create a tag and attach it to a todo, then filter by it:

```sh
curl -X POST http://127.0.0.1:8090/api/collections/tags/records \
  -H 'Content-Type: application/json' \
  -d '{"name":"Work"}'

curl -X POST http://127.0.0.1:8090/api/collections/todos/records \
  -H 'Content-Type: application/json' \
  -d '{"title":"Buy milk","tags":["<tag-record-id>"]}'

curl -G http://127.0.0.1:8090/api/collections/todos/records \
  --data-urlencode 'filter=tags ~ "<tag-record-id>"'
```

### Verify

Run the end-to-end check against a throwaway data directory (boots PocketBase on port 8099,
creates records with and without a deadline, reads them back, asserts the response shape and that
the deadline round-trips, then cleans up):

```sh
./scripts/verify-todos.sh
```
