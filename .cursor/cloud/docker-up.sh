#!/usr/bin/env bash
# Bring up a Docker daemon suitable for a nested Cloud Agent VM (no systemd).
# Idempotent: safe to call from both `install` and `start`.
set -euo pipefail

# Same-bridge container-to-container traffic must not be dropped by the host
# netfilter FORWARD hooks (Supabase's containers talk to each other on one bridge).
sudo sysctl -w net.ipv4.ip_forward=1 >/dev/null 2>&1 || true
sudo sysctl -w net.bridge.bridge-nf-call-iptables=0 >/dev/null 2>&1 || true
sudo sysctl -w net.bridge.bridge-nf-call-ip6tables=0 >/dev/null 2>&1 || true

if ! sudo docker info >/dev/null 2>&1; then
  echo "[cloud] starting dockerd (fuse-overlayfs)..."
  sudo rm -f /var/run/docker.pid /var/run/docker/containerd/containerd.pid 2>/dev/null || true
  # overlay2 is unavailable in this nested kernel; fuse-overlayfs is the working driver.
  sudo nohup dockerd --storage-driver=fuse-overlayfs >/tmp/dockerd.log 2>&1 &
  for _ in $(seq 1 90); do
    if sudo docker info >/dev/null 2>&1; then break; fi
    sleep 1
  done
fi

# Let the repo user drive docker (and the Supabase CLI) without sudo.
sudo chmod 666 /var/run/docker.sock
docker info >/dev/null
echo "[cloud] dockerd ready"
