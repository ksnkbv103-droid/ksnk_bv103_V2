# Audit cascade CRUD — 2026-09-27

| Trường | Giá trị |
|--------|---------|
| Ngày | 2026-09-27 (Asia/Saigon) |
| Máy | Nghĩa Mac · `6bad1c57-5c17-4e62-b661-16f3bab10f88` |
| Repo | `/Users/drnghia/Desktop/ksnk_bv103` |
| Branch | `cursor/me-sync-recall-print` |
| Tip start | `08014cd` (ahead 32 · doors+BOM done) |
| Phạm vi | Cascade create/update/delete → status · tồn/set counts · board · báo cáo |
| Không | push / PR / merge / Vercel / Cloud / apply migrate / DROP |

Liên quan: `_audit-qlcv-cssd-me-2026-09-27.md` (F1–F5 doors/BOM/park migrate).

## Trace map (write → surfaces)

| Module | Mutate | Server write | Revalidate / FE refresh |
|--------|--------|--------------|-------------------------|
| QLCV | create/edit/close/delete/approve đề xuất | `cong-viec.actions` · `dexuat` · `fn_qlcv_transition` · `appendQlcvNhatKy` | `revalidatePath(/quan-ly-cong-viec)` + `refreshAll` → kanban + `gateCountsRefreshKey` |
| QLCV | spawn định kỳ | `fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay` | path revalidate; **FE board/gate không bump** trước fix C1 |
| CSSD dung-cu | LUAN_CHUYEN | `createIncidentReport` → `rpc_cssd_commit/apply_instrument_lines` | `revalidateCssdInventorySurfaces`; **catalog client stale** trước fix C2 |
| CSSD dung-cu | HISTORY | read `cssd_fact_kho_giao_dich` | remount on tab = refetch OK |
| CSSD dung-cu | KIEM_KE tab | — | **không có tab** · `touchNgayKiemKe` trên RPC ledger khi cần |
| CSSD dung-cu | catalog / đề nghị | de-nghi approve · MDM forms | `revalidateCssdInventorySurfaces` + local reloadChiTiet |
| CSSD su-co | Hỏng/Mất | set-reconcile → ledger RPC (so_luong_thuc_te / kho) | incident + inventory revalidate |
| CSSD su-co | picker | `listActiveBoForInstrumentTransfer` · composition `is_active` | OK active-only; không join open quy_trinh (cố ý cho luân chuyển) |
| Mẻ TK | add/remove/start | `rpc_cssd_me_*` | `reloadProcessContext` + batch/workflow revalidate |
| Mẻ TK | complete/recall | `rpc_cssd_me_ket_luan_*` / `thu_hoi` | **migrate ME chưa apply remote** — park |

## Findings

### C1 · P0 FE — spawn định kỳ không cập nhật board_counts / list

| | |
|--|--|
| **Evidence** | `DinhKyRulesPanel.runSpawn` chỉ `load()` mẫu; không gọi `refreshAll`. `useQlcvKanban` chỉ `fetchTasksInitial` một lần mount. Sau «Sinh phiếu hôm nay» → tab Điều hành / GateStats stale tới khi F5 hoặc mutate khác. |
| **A** | `onAfterSpawn` → `refreshAll` (kanban + `gateCountsRefreshKey`). 3 chỗ prop. |
| **B** | Poll/focus refetch toàn page — nặng hơn. |
| **Chọn** | **A** — thinnest Domain-correct. |

### C2 · P0 FE — LUAN_CHUYEN không reload catalog counts

| | |
|--|--|
| **Evidence** | `CSSDCatalogLuanChuyenTab` không truyền `onSubmitted`. `useCssdCatalogPage` giữ `catalog` client; sau ghi sổ (RPC) BO/LOAI tồn vẫn số cũ tới reload. HISTORY remount khi đổi tab → OK. |
| **A** | `onSubmitted={() => void s.reload()}` từ `/cssd-dung-cu`. |
| **B** | `router.refresh()` only — không đủ cho client fetch. |
| **Chọn** | **A**. |

### C3 · P1 UX — HISTORY thiếu nhãn DIEU_CHUYEN / TRA_KHO

| | |
|--|--|
| **Evidence** | `InventoryHistoryTable` TYPE_LABEL không có 2 loại luân chuyển → hiện `DIEU_CHUYEN` thô. |
| **Chọn** | **A** thêm label (đi kèm C2). |

### C4 · OK — QLCV create/edit/close/delete/approve → board + nhật ký

| | |
|--|--|
| **Evidence** | create appends `PHAN_CONG` nhật ký; detail/approve/delete/import/`navigateQlcvMain` đều `refreshAll` + bump gate. `updateCongViec` chặn đổi trạng thái trực tiếp (transition RPC). |

### C5 · OK — su-co Hỏng/Mất → kho/set qua ledger RPC

| | |
|--|--|
| **Evidence** | `applySetReconcilePhysicalLines` / `commitInstrumentReportRpc` → `rpc_cssd_apply_instrument_lines` cập nhật `so_luong` chi tiết + `so_luong_kho_du_phong`. Composition loader `.eq("is_active", true)`. Picker bộ `.eq("is_active", true)`. |

### C6 · Park — Mẻ ME-S* migrate chưa apply (giống F5)

| | |
|--|--|
| **Evidence** | FE gọi `rpc_cssd_me_*`; add/remove/start đã `reloadProcessContext`. UAT nhả/thu hồi chờ Nghĩa apply. Không invent FE bypass. |
| **Chọn** | Park. `confirmKetThuc` chỉ mở QC form (FE write `trang_thai_me`) — đúng cổng; set station đổi ở bat_dau/ket_luan RPC. |

### C7 · P2 — dead dual path inventory write

| | |
|--|--|
| **Evidence** | `reportInventoryIssue` / `recordInstrumentTransaction` export nhưng **0 callers**. SSOT = `createIncidentReport`. |
| **Chọn** | Park xóa (hygiene sau; không đụng scope cascade). |

### C8 · Park — Wave3 QLCV dm drop (F4)

Giữ.

## Phase B applied (local)

| ID | Commit intent | Files |
|----|---------------|-------|
| C1 | spawn → refreshAll | `DinhKyRulesPanel` · `QlcvDinhKyPanel` · `QuanLyCongViecPage` |
| C2 | luan-chuyen → catalog reload | `CSSDCatalogLuanChuyenTab` · `app/cssd-dung-cu/page` |
| C3 | HISTORY labels | `InventoryHistoryTable` |

## UAT cascade checklist

- [ ] QLCV: Tạo việc → GateStats + Kanban/list tăng; nhật ký có PHAN_CONG
- [ ] QLCV: Sửa / đóng (xác nhận HT) / xóa → counts + list khớp; báo cáo tab reload khi mở lại
- [ ] QLCV: Duyệt đề xuất → cột đề xuất hết, board có phiếu mới, gate bump
- [ ] QLCV: «Sinh phiếu hôm nay» → chuyển Điều hành thấy phiếu mới + gate counts (C1)
- [ ] CSSD: Luân chuyển ghi sổ → tab Bộ/Loại số tồn mới không F5 (C2); Lịch sử kho có DIEU_CHUYEN/TRA_KHO (C3)
- [ ] CSSD su-co: Hỏng/Mất → tồn chi tiết + kho dự phòng giảm; HISTORY hiện BAO_HONG/BAO_MAT
- [ ] CSSD: Picker bộ chỉ `is_active`; composition chỉ dòng active
- [ ] Mẻ: add/remove khi đang nạp → list mẻ + waiting refresh; start chốt nạp
- [ ] Mẻ: complete/recall — **park tới migrate apply**

## Status board

| Item | Status |
|------|--------|
| F1–F3 doors/BOM | done prior tip |
| C1 spawn board | fixed local |
| C2 luan-chuyen catalog | fixed local |
| C3 HISTORY labels | fixed local |
| C4–C5 OK | no change |
| C6 ME migrate | parked |
| C7 dead writers | parked |
| C8 Wave3 | parked |
| Push/PR | **no** |
