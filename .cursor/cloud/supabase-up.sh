#!/usr/bin/env bash
# Start the local Supabase stack (applies migrations + seed on first init).
# Idempotent: no-op when the stack is already running.
set -euo pipefail

if npx --no-install supabase status >/dev/null 2>&1; then
  echo "[cloud] Supabase already running"
  exit 0
fi

# A cold VM can race the DB healthcheck on the very first attempt; retry once.
npx --no-install supabase start || { echo "[cloud] retrying supabase start..."; sleep 5; npx --no-install supabase start; }
echo "[cloud] Supabase up"
