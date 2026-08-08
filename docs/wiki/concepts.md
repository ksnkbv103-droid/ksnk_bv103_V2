# Wiki — Concepts (chéo module)

> Một file thay cho `concepts/*` + doc module trùng nội dung.

## Bounded contexts & prefix DB

| Prefix | Miền |
|--------|------|
| `sys_` | Audit, RBAC, lookup, module locks |
| `mdm_` | Khoa, nhân sự |
| `cssd_` | Tái xử lý dụng cụ |
| `gstt_` | VST, GSC |
| `nkbv_` | HAI |
| `qlcv_` | Công việc nội bộ |
| `auth_` | **Chỉ VIEW alias** |

**Migration:** DDL/WRITE → TABLE physical ([`implementation-mapping.md`](../core/implementation-mapping.md)). SELECT có thể qua view `dm_*` / `fact_*`.

- Ma trận coupling: [`../reference/architecture/interaction-matrix.md`](../reference/architecture/interaction-matrix.md)
- Tách PR: [`../reference/architecture/unstaged-slice-split.md`](../reference/architecture/unstaged-slice-split.md)

---

## CSSD vs MDM {#cssd-vs-mdm}

| Câu hỏi | Trả lời |
|---------|---------|
| Khoa / nhân sự / chức danh? | **MDM tổ chức** — `mdm_dm_khoa_phong`, `mdm_nhan_su`, lookup `sys_lookup_value` |
| Định nghĩa loại / bộ / BOM / thiết bị / hóa chất? | **Master CSSD** — TABLE `cssd_dm_*`, CRUD tại `/quan-tri-he-thong/danh-muc/*` |
| Phiên QR trạm 3–6? | **CSSD vận hành** — `cssd_fact_quy_trinh*` |
| Scan, QC mẻ, sự cố, giao dịch kho? | CSSD only — `cssd_fact_*` (không CRUD master dưới `/cssd-*`) |

Tránh gọi “MDM” cho cả master CSSD — dễ lẫn với khoa/nhân sự. Lộ trình: [`../modules/mdm/improvement-roadmap-20260717.md`](../modules/mdm/improvement-roadmap-20260717.md).

Rules: `20-master-data-placement.mdc`, `12-cssd-erp-spec-context.mdc`. Reform: [`../modules/cssd/reform-plan.md`](../modules/cssd/reform-plan.md).

---

## Layout primitives {#layout-primitives}

> UX đầy đủ: [`engineering-guidelines.md`](../core/engineering-guidelines.md) §2.

| Primitive | File |
|-----------|------|
| Design tokens | `src/lib/bv103-design-tokens.ts` |
| Panel / form | `src/lib/bv103-layout-chrome.ts` |
| Page shell | `KsnkPageShell.tsx` — **chỉ** trong `ClientLayoutWrapper` |
| Analytics frame | `Bv103AnalyticsPageFrame.tsx` — Command Center, Báo cáo tổng hợp |
| Supervision | `ksnk-supervision-chrome.tsx` |
| Admin title | `KsnkPageHeader` — RBAC, MDM, danh mục |
| CSSD chrome | `cssd-ui-chrome.ts` (extends layout chrome) |

Doc chi tiết: [`modules/giam-sat/layout-primitives.md`](../modules/giam-sat/layout-primitives.md).

**Sidebar (module-first):** SSOT [`sidebar-nav-groups.ts`](../../src/lib/nav/sidebar-nav-groups.ts) — cổng vào module/workspace. **Điều hành:** «Tổng quan KSNK» → `/` + «Báo cáo chính thức» → `/bao-cao-tong-hop`. **Giám sát:** một mục «Giám sát» → `/giam-sat` (QR / lịch sử / thống kê vào từ hub; bookmark `/qr` vẫn sống). Deep-link VST/GSC/NKBV mở từ hub. Lịch sử / Thống kê VST·GSC: `/lich-su/*`, `/thong-ke/*`. **CSSD:** sidebar tách «Vận hành» vs «Tra cứu» là **cổng chuyển màn duy nhất** (không ModeNav trùng trên hero). **Quản trị:** một mục «Quản trị hệ thống» → hub [`/quan-tri-he-thong`](../../src/lib/nav/sidebar-admin-nav-groups.ts). Ai thấy mục nào = `NavGate`. Chương trình giản hóa: [`simplification-program-20260726.md`](../reference/architecture/simplification-program-20260726.md).

1. `rounded-2xl` / `xl` — `npm run layout:drift-check`
2. Label tối thiểu `text-[11px]` — `npm run layout:typography-check`
3. Tối đa: hero → một panel → bảng (không card lồng card)
4. Dashboard `/`: dùng `Bv103AnalyticsPageFrame` — **không** `max-w-[1400px]` lồng shell

---

## GSC scoring {#gsc-scoring}

**Hai lớp đo song song (2026-07-27):**

| Lớp | Cột / nguồn | Ý nghĩa |
|-----|-------------|---------|
| **Tỷ lệ tiêu chí** | `tong_diem` + view `tong_dat`/`tong_quan_sat` | % Đạt/(Đạt+Không đạt) — luôn có (trừ nhật ký) |
| **Care bundle** | `dat_tron_goi` | Chỉ `TRON_GOI` — đạt gói then chốt hay không |
| **Chi tiết lỗi** | `results_jsonb` | Thống kê tiêu chí hay vi phạm |

| Kiểu BK | Persist `tong_diem` | Cờ phụ (DB) | UI người dùng |
|---------|---------------------|--------------|----------------|
| `TY_LE` | % | — | `66.67% · Đạt` |
| `TRON_GOI` | % | `dat_tron_goi` (không hiện phụ) | `66.67% · Đạt` |
| `DAT_KHONG_DAT` | % | — | `66.67% · Đạt` (không “Chưa đủ 100%”) |
| `NHAT_KY` | null | — | Nhật ký / ngoài ngưỡng |

Engine: `giam-sat-scoring.ts` · Write: `resolveScoringSummary` · UI: `gsc-score-display.ts`.

---

## CSSD BOM — JSON vs bảng con {#cssd-bom-rationale}

**BOM dụng cụ:** giữ `cssd_dm_bo_dung_cu_chi_tiet` (FK, SUM, truy vết QR). JSON chỉ cho metadata phụ — không thay dòng chi tiết có `loai_dung_cu_id` + `so_luong`.

`legacy_danh_muc_id`: cột migration đối chiếu hệ cũ; có thể sunset sau cutover ổn định.

`dm_bo_dung_cu_phan_bo`: phân bổ tồn theo khoa — dùng khi bật ledger đầy đủ; xem reform plan.
