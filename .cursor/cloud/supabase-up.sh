#!/usr/bin/env bash
# Start the local Supabase stack (applies migrations + seed on first init).
# Idempotent, and converges to exit 0 whenever the core API is healthy — the
# CLI can return non-zero on a cold DB-healthcheck race or a flaky auxiliary
# container even though the stack comes up fine moments later.
set -uo pipefail

status_ok() { npx --no-install supabase status >/dev/null 2>&1; }

if status_ok; then
  echo "[cloud] Supabase already running"
  exit 0
fi

# Exclude auxiliary services that are unneeded for local dev and flaky in a
# nested VM (edge_runtime has been observed to exit 255), so `status` can gate
# cleanly on the core API/DB/auth/rest/storage/realtime services.
EXCLUDE="edge-runtime,imgproxy,pooler,studio"
npx --no-install supabase start -x "$EXCLUDE" || true

# Readiness is the source of truth, not the CLI exit code. Poll up to ~120s.
for _ in $(seq 1 60); do
  if status_ok; then
    echo "[cloud] Supabase up"
    exit 0
  fi
  sleep 2
done

echo "[cloud] ERROR: Supabase did not become ready in time" >&2
npx --no-install supabase status || true
exit 1
