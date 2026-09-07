#!/usr/bin/env bash
# Cloud Agent `install`: durable, idempotent setup after checkout.
# Installs system deps + node deps, then warms the local Supabase stack so its
# Docker images and seeded DB volume bake into the environment build/snapshot.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

if ! command -v dockerd >/dev/null 2>&1; then
  echo "[cloud] installing Docker + fuse-overlayfs..."
  sudo apt-get update
  sudo apt-get install -y --no-install-recommends docker.io fuse-overlayfs uidmap
fi

npm ci

# Warm-start the stack once so migrations + seed run and images/volume persist
# into the baked image. Per-boot startup then just reuses this state.
bash .cursor/cloud/docker-up.sh
bash .cursor/cloud/write-env.sh
bash .cursor/cloud/supabase-up.sh

npm run env:check
echo "[cloud] install complete"
