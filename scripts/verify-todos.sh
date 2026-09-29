#!/usr/bin/env bash
#
# End-to-end check for the todos collection: boots PocketBase against a throwaway
# data dir, creates and reads a record, and asserts the response shape.
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
  if (!r.created) fail("created is empty");
  if (!r.updated) fail("updated is empty");
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

echo "OK: todos collection created, record create + list verified"
