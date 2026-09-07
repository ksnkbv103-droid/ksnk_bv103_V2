#!/usr/bin/env bash
# Cloud Agent `start`: per-boot reconciliation. Brings the Docker daemon and the
# local Supabase stack back up (reusing the baked, already-seeded DB volume), then
# returns so the `dev` terminal can launch Next.js.
set -euo pipefail

bash .cursor/cloud/docker-up.sh
bash .cursor/cloud/write-env.sh
bash .cursor/cloud/supabase-up.sh
echo "[cloud] start complete — Supabase ready at http://127.0.0.1:54321"
