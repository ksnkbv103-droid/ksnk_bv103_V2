> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`open-backlog-20260731.md`](../../../reference/architecture/open-backlog-20260731.md). Tra cứu lịch sử được.

# Batch 8.3 — SSR-safe shell spike (decision)

> 2026-09-07 · Local only · **SKIP / không lật SSR** trong đợt này.

## Context
Root shell (`PermissionProvider` + `ClientLayoutWrapper`) is client-bound (auth session, RBAC view, sidebar gates). Routes `/` and `/bao-cao-tong-hop` already use `dynamic(..., { ssr: false })` for auth + Recharts hydrate (see Batch 5 residual notes).

## Options considered
1. Flip one read-only báo cáo route to RSC shell with client islands for charts — needs splitting Command Center / báo cáo auth gates and chart trees.
2. Keep client shell; rely on Batch 8.1 (RBAC soft cache) + 8.2 (offline by region) for nav cost.

## Decision
**Prefer (2).** Flipping `/` or `/bao-cao-tong-hop` SSR in one pass is **not safe**: auth redirect, guest-stats shell, and Recharts hydrate still require client ownership of the page root. Revisit only after a dedicated RSC island split (separate batch), not as a drive-by.

## Done when
Spike documented; no SSR flip shipped.
