# Audit QLCV / Công việc — 2026-09-25

> **Auditor:** KSNK Soft · Delivery Lead (executor)  
> **Repo tip:** `cursor/me-sync-recall-print` @ `b45a1d1` (ahead 1 vs origin; WT clean — tip đang CSSD ME, không dirty ME QLCV)  
> **DB app (.env.local):** `cvzwslpxwgqiugzzhqej` (ksnk-bv103-prod) — **READ-ONLY** probe  
> **Phạm vi:** QLCV / Công việc only — không audit CSSD sâu  
> **Không:** push / merge / Vercel / apply_migration  

---

## 1. Module map

### 1.1 Route & nav

| Surface | Path / entry | Ghi chú |
|---------|--------------|---------|
| Trang module | `/quan-ly-cong-viec` → `src/app/quan-ly-cong-viec/page.tsx` → `views/QuanLyCongViecPage.tsx` | **Một cửa** duy nhất |
| Sidebar | `Công việc` · `NAV_GATE_CONG_VIEC` · nhóm «Vận hành nội bộ» | `src/lib/nav/sidebar-nav-groups.ts:70` |
| Tabs UI | `DIEN_HANH` (Điều hành) · `DINH_KY` (Danh mục định kỳ, nếu edit/admin) | `mainTabs` — **không** đưa `NHIEM_VU` vào tab list |
| Nhiệm vụ | `Tabs.Content value="NHIEM_VU"` + link text **«Kế hoạch năm»** | `QuanLyCongViecPage.tsx:518–526, 575–591` — discoverability yếu |
| Deep link legacy | `?tab=PHAN_CONG_TUAN\|TUAN\|CHUONG_TRINH\|KE_HOACH_NAM` → ép `DIEN_HANH` | A+2 đã DROP container/mốc |

### 1.2 Key files (SSOT kỹ thuật)

| Layer | Path |
|-------|------|
| Types / contract | `src/modules/quan-ly-cong-viec/types.ts` |
| Domain status | `src/lib/domain/qlcv/trang-thai-canonical.ts` |
| Nghiệm thu gate | `src/lib/domain/qlcv/nghiem-thu-gate.ts` |
| Định kỳ auto-close | `src/lib/domain/qlcv/dinh-ky-auto-complete.ts` |
| KSNK boundary | `src/lib/domain/qlcv/ksnk-boundary.ts` + `lib/qlcv-ksnk-server.ts` |
| Actions | `actions/cong-viec*.ts`, `dexuat`, `dinh-ky`, `nhiem-vu`, `hoat-dong`, `qlcv-import`, `qlcv-brief` |
| Transition | `lib/qlcv-transition-rpc.ts` → `fn_qlcv_transition` |
| Board / filter | `lib/qlcv-board-lanes.ts`, `qlcv-board-filter.ts`, `hooks/useQlcvKanban.ts`, `useQlcvTable.ts` |
| Continuity matrix | `docs/modules/qlcv/continuity-matrix-20260720.md` |
| Module README | `docs/modules/qlcv/README.md` (chủ yếu index migration) |
| Wiki | `docs/wiki/entities.md` § QLCV |
| Spec ngắn | `docs/core/domain-specification.md` §2.3 (**mỏng**) |
| Mapping | `docs/core/implementation-mapping.md` § Công việc |

### 1.3 Docs hiện có

- `README.md`, `continuity-matrix-20260720.md`, `intake-ksnk-only-202606.md`, `pilot-checklist-202606.md`
- ADR: `docs/reference/architecture/adr-qlcv-text-check-deferred.md`
- **Thiếu** `domain-overview.md` / module-lock kiểu CSSD

### 1.4 RPC / bảng (code + live)

**TABLE:** `qlcv_fact_cong_viec`, `qlcv_fact_cong_viec_dinh_ky`, `qlcv_fact_nhiem_vu`  
**VIEW:** `v_qlcv_cong_viec_full`, `v_qlcv_cong_viec_qua_han`, `qlcv_dm_*`  
**RPC app gọi:** `fn_qlcv_transition`, `fn_qlcv_update_checklist`, `fn_qlcv_append_nhat_ky`, `fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay`  
**Cron live:** `fn_sync_overdue_tasks` (17:05 UTC≈00:05 ICT+1d), spawn định kỳ `0 1 * * *`  
**RPC live nhưng tip/app không dùng:** `rpc_qlcv_board_counts`, `rpc_qlcv_nhiem_vu_rollup` (migration DB `20260909030202_qlcv_perf_batch12_rpcs` — **file migration không có trên tip**)

---

## 2. Domain model (as-built)

| Khái niệm | Hiện trạng |
|-----------|------------|
| **Phiếu công việc** | `qlcv_fact_cong_viec` — SSOT ghi/đọc list qua `v_qlcv_cong_viec_full` |
| **Mẫu định kỳ** | `qlcv_fact_cong_viec_dinh_ky` → spawn instance + `dinh_ky_mau_id` |
| **Nhiệm vụ (mục tiêu)** | `qlcv_fact_nhiem_vu` độc lập; FK tuỳ chọn trên phiếu/mẫu — **không** còn KH năm / tuần / mốc (DROP `20260802140000`) |
| **Người** | `nguoi_tao_id`, `nguoi_giao_viec_id`, `nguoi_phu_trach_id`, `nguoi_phoi_hop_ids[]`, `nguoi_theo_doi_ids[]`, `to_cong_tac_id` |
| **Hạn / lịch** | `han_hoan_thanh`, `ngay_thuc_hien`, `gio_bat_dau`/`gio_ket_thuc` |
| **Địa điểm** | `dia_diem_khoa_id` (MDM khoa) + `vi_tri_thuc_hien` text — bắt buộc khi tạo |
| **Loại** | `DINH_KY` \| `DOT_XUAT` \| `KHAN_CAP` |
| **Ưu tiên** | `THAP` \| `TRUNG_BINH` \| `CAO` |
| **Tiến độ** | `phan_tram_hoan_thanh` + `checklist` jsonb; nhật ký `nhat_ky` jsonb |
| **Trạng thái (7)** | `MOI` → `DANG_LAM` → `CHO_DUYET` → `HOAN_THANH` / `TU_CHOI` / `QUA_HAN` / `DA_HUY` |
| **Đề xuất** | Virtual: `is_active=false` + `MOI` → lane «Đề xuất chờ duyệt» |
| **Parent/subtask** | **Đã gỡ** (lean) |
| **Attachment / notification** | **Không** có trong module |
| **Liên module** | `analytics_meta` jsonb (PDCA từ analytics); helper `buildQlcvAnalyticsDeepLink` — **không còn caller** GSC/TGS (khớp H2) |
| **Phạm vi** | KSNK-only (`ensureQlcvKsnkAccess` / validate assignee thuộc khoa KSNK) |

**Lifecycle ngắn:** Tạo trực tiếp (bắt buộc phụ trách trên form → `DANG_LAM`) · Đề xuất → phê · Checklist/% → định kỳ 100% tự `HOAN_THANH` · đột xuất/khẩn → `CHO_DUYET` → nghiệm thu · Cron quá hạn → `QUA_HAN` (nhãn; lane vẫn «đang làm»/cổng nghiệm thu khi %).

---

## 3. Tiêu chí đánh giá

| Tiêu chí | Kết quả | Evidence |
|----------|---------|----------|
| **Chuẩn mực / khoa học** (taxonomy rõ, không cửa trùng) | **Partial** | 7 mã CHECK khớp domain+FE (`trang-thai-canonical.ts`, DB CHECK). Một route sidebar. Nhưng: Nhiệm vụ đổi nhãn «Kế hoạch năm» + không vào `mainTabs` (`QuanLyCongViecPage.tsx:329–336, 518–525`) — lệch wiki «Điều hành + Nhiệm vụ + Định kỳ». Domain §2.3 chỉ 4 bullet — thiếu overview kiểu CSSD. |
| **Chính xác** (status/counts cập nhật create/edit/delete) | **Partial** | Write actions `revalidatePath("/quan-ly-cong-viec")` rộng. Gate chips **đếm client** từ `mergedTasks` (`QlcvGateStats.tsx:22–29`) — không gọi `rpc_qlcv_board_counts` (RPC live orphan). Board fetch cap 500×20 (`qlcv-query-limits.ts`) → stats có thể lệch khi >10k. `QUA_HAN` vừa mã DB vừa computed (`isQlcvBoardOverdue`) — đúng design lean nhưng dễ nhầm «cổng riêng». |
| **Đơn giản, dễ quan sát, dễ thực hiện** | **Partial** | Lean: bỏ KPI tháng, việc con, cổng nhận việc. Bảng + Kanban + filter chip. Print kế hoạch/thực hiện kỳ. Nhưng: 3 bề mặt + import + admin DM links + NV chìm; empty prod (0 phiếu / 0 mẫu) → không quan sát được vận hành thật. |
| **Rõ người / rõ việc / rõ tiến độ / rõ trách nhiệm** | **Partial** | Form `required` phụ trách + địa điểm; bảng có Người giao / Phụ trách / %. Có `nguoi_phoi_hop_ids` / `nguoi_theo_doi_ids` nhưng **không** cột list. `validateAssigneeForQlcv` cho phép `null` (API); `to_cong_tac_id` alone → `DANG_LAM` không người (`qlcv-initial-trang-thai.ts`). Không RACI formal (A/R/C/I). |
| **Thống kê / báo cáo được** | **Fail → Partial** | Đã gỡ tab KPI (`20260531200000`). Còn print plan/exec + filter kỳ; **không** export Excel board; **không** aggregates dashboard QLCV. `rpc_qlcv_nhiem_vu_rollup` live nhưng không wire FE. Brief CC (`qlcv-brief.actions.ts`) còn permission Overview — surface CC «Việc hôm nay» đã bỏ (H2). |

---

## 4. Tip ↔ DB schema

**Env:** `NEXT_PUBLIC_SUPABASE_URL=https://cvzwslpxwgqiugzzhqej.supabase.co`

| Hạng mục | Tip (code/migrations) | Live DB | Khớp? |
|----------|----------------------|---------|-------|
| Tables `qlcv_fact_*` (3) | Có | Có | ✅ |
| Cols assignment (`vi_tri`, `nguoi_phoi_hop_ids`, `nguoi_theo_doi_ids`) | `20260729170000` | Có | ✅ |
| Schedule/location (`ngay_thuc_hien`, `gio_*`, `dia_diem_khoa_id`, `nhiem_vu_id`) | `20260731140000` + drop A+2 | Có trên fact + view | ✅ |
| CHECK 7 `trang_thai` | `20260709140000` | Giống | ✅ |
| CHECK `loai` 3 mã | `20260604130000` | Giống | ✅ |
| Core RPCs transition/checklist/nhật ký/spawn/overdue | Có | Có | ✅ |
| Cron overdue + spawn | migrations | jobid 5, 7 | ✅ |
| `rpc_qlcv_board_counts` / `rpc_qlcv_nhiem_vu_rollup` | **Không** file `20260909030202_*` trên tip; **không** gọi trong `src/` | **Có** (applied `qlcv_perf_batch12_rpcs`) | ❌ drift tip←DB |
| Data pilot | — | `cong_viec=0`, `dinh_ky=0`, `nhiem_vu=1` | ⚠️ empty (wipe A+2) |

**Stale doc:** `implementation-mapping.md` còn nhắc `v_fact_cong_viec_full` (legacy) — view thật `v_qlcv_cong_viec_full`.

---

## 5. GSC H2 lock (2026-09-17) — xác nhận QLCV

| Khóa H2 | Trạng thái tip |
|---------|----------------|
| `/` → Báo cáo chính thức; bỏ Tổng quan / Việc hôm nay | Sidebar chỉ `Báo cáo chính thức` trong «Điều hành KSNK» (`sidebar-nav-groups.ts:51–57`) — ✅ |
| Công việc = menu riêng | `Công việc` → `/quan-ly-cong-viec` — ✅ |
| Không link tạo việc từ Tổng quan / Thống kê GSC (TGS) | Grep `quan-ly-cong-viec` / `buildQlcvAnalyticsDeepLink` trong `giam-sat-chung` / dashboard callers: **không** — ✅ |
| Helper deep-link còn trong lib | `src/lib/analytics/qlcv-analytics-deep-link.ts` — dead entry OK (không illegal embed) |
| Brief QLCV cho CC | `getQlcvQuaHanBrief` còn — surface consumer H2 đã gỡ; **P2** dọn hoặc giữ cho BCTH sau |

**Kết luận H2:** QLCV **tách đúng**; không embed trái phép trong GSC.

---

## 6. Backlog P0 / P1 / P2

### P0

1. **Repo↔DB migration drift:** live có `20260909030202_qlcv_perf_batch12_rpcs`; tip **thiếu file** — rủi ro migrate/rebase/restore. Cần recover SQL vào `supabase/migrations/` (hoặc archive có chủ đích) **không** apply lại prod.
2. **Counts không SSOT:** GateStats đếm client; RPC `rpc_qlcv_board_counts` sẵn trên DB nhưng không dùng → lệch standing mandate «status/counts update».
3. **IA Nhiệm vụ chìm:** entity còn, panel còn, nhưng tab list không có + nhãn «Kế hoạch năm» sai taxonomy (A+2 đã DROP KH năm container) → người dùng không «rõ việc / rõ mục tiêu».
4. **Domain SSOT mỏng:** không có `domain-overview` / lock A — không chốt được «khoa học» trước slice lớn.

### P1

5. **Báo cáo / thống kê module:** không cửa aggregate/export; rollup nhiệm vụ RPC orphan.
6. **RACI list UX:** ẩn phối hợp / theo dõi trên bảng điều hành; khó «rõ trách nhiệm» ở độ cao quan sát.
7. **Doc stale:** mapping `v_fact_*`; brief CC permission Overview.
8. **Pilot data rỗng** trên DB app trỏ: không UAT quan sát/đếm được trên môi trường đang dùng.

### P2

9. Dọn dead deep-link / brief CC hoặc gắn 1 chỗ BCTH có chủ đích.  
10. Attachment / notification (ngoài lean — chỉ khi PO mở).  
11. Giảm dual mental model `QUA_HAN` mã vs nhãn (copy UI).  

---

## 7. «Lead đề xuất» — Domain lock defaults (A)

> Chưa khóa PO — đánh dấu đề xuất.

| # | Đề xuất A (default) | Lý do |
|---|---------------------|-------|
| A1 | **3 cửa IA cố định:** Điều hành · Nhiệm vụ · Định kỳ — Nhiệm vụ là tab ngang hàng, **cấm** nhãn «Kế hoạch năm» | Khớp wiki; A+2 đã bỏ container KH năm |
| A2 | **Người thực hiện:** tạo việc trực tiếp **bắt buộc** `nguoi_phu_trach_id` (không chỉ tổ); đề xuất được để trống đến khi phê | «Rõ người» |
| A3 | **Counts SSOT:** chips/cột Kanban đọc `rpc_qlcv_board_counts` (hoặc cùng công thức SQL) sau mọi mutate + refresh | Mandate chính xác |
| A4 | **Trạng thái quan sát:** lane = đời sống việc; quá hạn = **nhãn** (không cột Kanban riêng) — giữ design hiện tại, chốt copy | Tránh cửa trùng |
| A5 | **Báo cáo MVP:** 1 panel «Theo kỳ» (lọc tuần/tháng/quý) + in đã có + export CSV list; không khôi phục KPI tháng trừ PO | Thống kê được, lean |
| A6 | **Biên module:** KSNK-only giữ; không deep-link tạo việc từ GSC/TGS (H2) | Đã đúng — khóa lại |
| A7 | Viết `docs/modules/qlcv/domain-overview.md` (copy cấu trúc CSSD rút gọn) trước mọi schema mới | SSOT nghiệp vụ |

---

## 8. UAT checklist (tay)

- [ ] Sidebar: chỉ **Công việc** (không «Việc hôm nay» trên GSC/BCTH).  
- [ ] Tạo việc: thiếu phụ trách / địa điểm → chặn; có đủ → `DANG_LAM`; chip «Của tôi» / «Cần làm» tăng.  
- [ ] Đề xuất → phê (giao phụ trách) → xuất hiện Điều hành; từ chối → đúng trạng thái.  
- [ ] Tick checklist định kỳ 100% → `HOAN_THANH` (không nghiệm thu).  
- [ ] Đột xuất 100% → `CHO_DUYET` → nghiệm thu / từ chối.  
- [ ] Sửa / hủy / import → list + chips cập nhật không F5 lệch.  
- [ ] Tab **Nhiệm vụ**: CRUD mục tiêu, gắn việc, rollup (sau khi wire).  
- [ ] Định kỳ: tạo mẫu → spawn (cron/manual) → instance có `dinh_ky_mau_id`.  
- [ ] Quá hạn: nhãn đỏ; cron hoặc hạn < hôm nay trên phiếu mở.  
- [ ] Print kế hoạch / thực hiện kỳ có dữ liệu đúng filter.  
- [ ] User ngoài KSNK: bị chặn module.  

---

## 9. Proposed SSOT outline (Lead đề xuất — chưa lock)

```
docs/modules/qlcv/domain-overview.md
  1. Ranh giới (KSNK-only; ≠ GSC/VST/CSSD; H2 không embed)
  2. Đối tượng: Phiếu · Mẫu định kỳ · Nhiệm vụ
  3. Vai trò: giao / phụ trách / phối hợp / theo dõi / phê
  4. Lifecycle 7 trạng thái + đề xuất ảo + quá hạn-nhãn
  5. Tiến độ: checklist vs % thủ công; cổng nghiệm thu
  6. IA 3 cửa + in kỳ
  7. Báo cáo MVP (filter + export)
  8. Non-goals: việc con, KPI tháng, attachment (trừ khi PO)
```

---

## 10. Next thin slice (đề xuất local fix)

**Slice 1 (khuyến nghị):** IA Nhiệm vụ — đưa `NHIEM_VU` vào `mainTabs`, đổi nhãn «Kế hoạch năm» → **«Nhiệm vụ»**, deep-link `?tab=NHIEM_VU` giữ; không đụng schema/DB.

**Slice thay thế (nếu ưu tiên chính xác counts):** recover file migration `20260909030202` vào tip + wire `QlcvGateStats` gọi `rpc_qlcv_board_counts` (read-only RPC), refresh sau mutate.

---

*Hết audit — 2026-09-25 ICT+7*
