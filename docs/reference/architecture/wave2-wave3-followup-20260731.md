# Wave 2–3 follow-up + Wave 4 (2026-07-31)

> Sau audit + Wave 1 UI. Backlog mở: [`open-backlog-20260731.md`](./open-backlog-20260731.md).  
> **UI tiếp theo (không gộp vào W2 BE):** chương trình B+3 S1–S5 — [`ui-consistency-program-20260802.md`](./ui-consistency-program-20260802.md).

## Wave 2 — An toàn & UAT (trạng thái)

| Slice | Việc | Trạng thái |
|-------|------|------------|
| W2.1 | Harden `master-crud-core` — bỏ `"use server"` | **Done** (cùng chat audit) |
| W2.2 | `requireDaoTaoUser` + `DAO_TAO` view | **Done** (cùng chat) |
| W2.3 | Guest enforce ở `proxy.ts` | **Done** — allowlist `guest-stats-access` sau `getUser()` |
| W2.4 | CSSD verify-before-admin convention | **Done** — reorder toàn `cssd-erp/actions` (+ lookup QR có verify) |
| W2.5 | Sync seed `DAO_TAO` + `admin:rbac:sync` | **Seed Done 2026-08-05** (`00-rbac.sql` + preset); `admin:rbac:sync:local --with-presets` khi Docker lên |
| W2.6 | UAT reform A–F + NKBV #2–#5 | **Chờ khoa ký** — không ký hộ |

## Wave 3 — Vệ sinh & analytics doc

| Slice | Việc | Trạng thái |
|-------|------|------------|
| W3.1 | Metric-dictionary: Top 10 gaps A5 | **Backlog** — chat doc/`@dashboard-pilot` |
| W3.2 | `unusedExports` WARN budget | **Done** slice — unexport/orphan + Fallow entry CLI |
| W3.3 | `D-21` gỡ import GSC deprecated | **Done** — xóa stub + orphan helpers |
| W3.4 | `layout:drift-check` adoption (InventoryIssueModal, …) | **Done** — gate sạch (`layout:drift-check` OK) |

## Wave 4 — Deferred (không mở)

Theo [`roadmap-dang-cap-wave4-20260728.md`](./roadmap-dang-cap-wave4-20260728.md): HIS/LIS FHIR, Spaulding map trạm thật, facade kho sâu — **chỉ khi viện có nguồn + `/intake-nv`**.

## Case kiểm tay còn lại (PO/khoa)

1. Ký bảng UAT reform + NKBV clinical.  
2. Sau bật Docker: `npm run pilot:go-live:gate:local`.  
3. Role không có `DAO_TAO` → không làm bài / admin ngân hàng.
