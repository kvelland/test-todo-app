#!/usr/bin/env bash
#
# End-to-end check for the todos collection: boots PocketBase against a throwaway
# data dir, creates and reads records (with and without a deadline), and asserts
# the response shape.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -x ./pocketbase ]; then
  echo "PocketBase binary not found. Run ./scripts/download-pocketbase.sh first." >&2
  exit 1
fi

PORT="${PB_TEST_PORT:-8099}"
DATA_DIR="$(mktemp -d)"
PB_PID=""
cleanup() {
  [ -n "$PB_PID" ] && kill "$PB_PID" 2>/dev/null || true
  rm -rf "$DATA_DIR"
}
trap cleanup EXIT

./pocketbase serve \
  --http="127.0.0.1:${PORT}" \
  --dir "$DATA_DIR" \
  --migrationsDir "$PWD/pb_migrations" >/dev/null 2>&1 &
PB_PID=$!

base="http://127.0.0.1:${PORT}"
for _ in $(seq 1 30); do
  if curl -sf "${base}/api/health" >/dev/null 2>&1; then break; fi
  sleep 0.5
done

if ! curl -sf "${base}/api/health" >/dev/null 2>&1; then
  echo "FAIL: PocketBase did not become healthy on ${base}" >&2
  exit 1
fi

record="$(curl -sf -X POST "${base}/api/collections/todos/records" \
  -H 'Content-Type: application/json' \
  -d '{"title":"verify"}')"

echo "$record" | node -e '
let d = "";
process.stdin.on("data", (c) => (d += c)).on("end", () => {
  const r = JSON.parse(d);
  const fail = (m) => { console.error("FAIL: " + m); process.exit(1); };
  if (r.collectionName !== "todos") fail("wrong collection");
  if (r.title !== "verify") fail("title not echoed");
  if (r.completed !== false) fail("completed did not default to false");
  if (r.deadline !== "") fail("deadline did not default to an empty string");
  if (!r.created) fail("created is empty");
  if (!r.updated) fail("updated is empty");
});
'

deadline_record="$(curl -sf -X POST "${base}/api/collections/todos/records" \
  -H 'Content-Type: application/json' \
  -d '{"title":"verify deadline","deadline":"2026-10-03T21:59:59.999Z"}')"

echo "$deadline_record" | node -e '
let d = "";
process.stdin.on("data", (c) => (d += c)).on("end", () => {
  const r = JSON.parse(d);
  const fail = (m) => { console.error("FAIL: " + m); process.exit(1); };
  if (!r.deadline) fail("deadline did not round-trip");
  if (!String(r.deadline).startsWith("2026-10-03")) fail("deadline date wrong: " + r.deadline);
});
'

list="$(curl -sf "${base}/api/collections/todos/records")"
echo "$list" | node -e '
let d = "";
process.stdin.on("data", (c) => (d += c)).on("end", () => {
  const r = JSON.parse(d);
  if (!Array.isArray(r.items) || r.items.length < 1) {
    console.error("FAIL: created record not present in list");
    process.exit(1);
  }
});
'

tag="$(curl -sf -X POST "${base}/api/collections/tags/records" \
  -H 'Content-Type: application/json' \
  -d '{"name":"verify-tag"}')"

tag_id="$(echo "$tag" | node -e '
let d = "";
process.stdin.on("data", (c) => (d += c)).on("end", () => {
  const r = JSON.parse(d);
  const fail = (m) => { console.error("FAIL: " + m); process.exit(1); };
  if (r.collectionName !== "tags") fail("wrong tag collection");
  if (r.name !== "verify-tag") fail("tag name not echoed");
  process.stdout.write(r.id);
});
')"

tagged="$(curl -sf -X POST "${base}/api/collections/todos/records" \
  -H 'Content-Type: application/json' \
  -d "{\"title\":\"verify tagged\",\"tags\":[\"${tag_id}\"]}")"

echo "$tagged" | node -e '
let d = "";
process.stdin.on("data", (c) => (d += c)).on("end", () => {
  const r = JSON.parse(d);
  if (!Array.isArray(r.tags) || r.tags.length !== 1) {
    console.error("FAIL: todo did not keep its tag relation");
    process.exit(1);
  }
});
'

# PocketBase matches a multi-relation field with `tags ~ "<id>"` (not `?=`).
filtered="$(curl -sf -G "${base}/api/collections/todos/records" \
  --data-urlencode "filter=tags ~ \"${tag_id}\"")"

echo "$filtered" | node -e '
let d = "";
process.stdin.on("data", (c) => (d += c)).on("end", () => {
  const r = JSON.parse(d);
  const fail = (m) => { console.error("FAIL: " + m); process.exit(1); };
  if (!Array.isArray(r.items) || r.items.length !== 1) fail("tag filter did not match exactly one todo");
  if (r.items[0].title !== "verify tagged") fail("tag filter matched the wrong todo");
});
'

echo "OK: todos + tags collections created; record create, list, deadline round-trip, and tag filter verified"
