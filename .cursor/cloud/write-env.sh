#!/usr/bin/env bash
# Write .env.local pointing at the local Supabase stack.
# The anon/service_role keys below are the well-known, deterministic keys that
# `supabase start` always issues for a local stack (public dev keys, not secrets).
set -euo pipefail

if [ -f .env.local ] && grep -q '127.0.0.1:54321' .env.local; then
  echo "[cloud] .env.local already configured for local Supabase"
  exit 0
fi

cat > .env.local <<'EOF'
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
NEXT_PUBLIC_SITE_URL=http://localhost:3000
E2E_USER_EMAIL=ksnkbv103@gmail.com
E2E_USER_PASSWORD=Pilot@103
PLAYWRIGHT_BASE_URL=http://localhost:3000
EOF
echo "[cloud] wrote .env.local for local Supabase"
