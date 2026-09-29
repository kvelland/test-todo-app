# test-todo-app

A todo app backed by [PocketBase](https://pocketbase.io/). This repository holds the
PocketBase setup: the download/run tooling and the `todos` collection schema, shipped as a
migration so a fresh clone sets itself up automatically.

## Prerequisites

- `curl` or `wget`
- `unzip`
- macOS or Linux (amd64 / arm64 / armv7)

## Setup

Download the pinned PocketBase binary (v0.40.4 by default) into the repo root:

```sh
./scripts/download-pocketbase.sh
```

The script is idempotent — it is a no-op once the correct version is present. Override the
version with `PB_VERSION=0.40.4 ./scripts/download-pocketbase.sh`.

## Run

```sh
./pocketbase serve
```

- REST API: <http://127.0.0.1:8090/api/>
- Admin dashboard: <http://127.0.0.1:8090/_/>

On first run PocketBase creates `pb_data/` (gitignored) and applies the migrations in
`pb_migrations/`, so the `todos` collection exists with no manual admin steps. Add future schema
changes as new migrations in `pb_migrations/` with a **larger** numeric prefix (Unix seconds) than
the existing file.

## Schema — `todos`

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

## REST API

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

## Verify

Run the end-to-end check against a throwaway data directory (boots PocketBase on port 8099,
creates and reads a record, asserts the response shape, then cleans up):

```sh
./scripts/verify-todos.sh
```
