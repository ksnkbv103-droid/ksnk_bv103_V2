# Audit note — TRAM_CSSD hybrid → CODE labels SSOT (Strategy B W4)

> 2026-09-26 · Slice labels only — **không** apply migrate, **không** DROP view `cssd_dm_tram`, **không** đổi graph ≠ 6 trạm.

## Quyết định

| Option | Nội dung | Chọn |
|--------|----------|------|
| A | Viết lại persist fact → TEXT `ma_tram` ngay | Parked (ADR riêng) |
| **B** | Một SSOT const 6 mã+nhãn; LOCKED hub; giữ FK UUID | **Yes** |
| C | Noop | — |

## Hiện trạng sau W4

- **CODE graph (Domain):** `TIEP_NHAN → LAM_SACH → QC → DONG_GOI → TIET_KHUAN → CAP_PHAT` — `src/modules/cssd-erp/workflow/domain/cssd-stations.ts` (`WORKFLOW_STEPS` + `STATION_LABEL`).
- **Persist:** vẫn `buildQuyTrinhTramPatch` / `resolveCssdTramId` → UUID `tram_hien_tai_id` (view `cssd_dm_tram` / `sys_lookup_value` `TRAM_CSSD`).
- **Hub:** `TRAM_CSSD` ∈ `LOCKED_SYSTEM_LOOKUP_LOAI` — UI chỉ xem; server generic CRUD/import reject (`lockedSystemLookupMutateError`). Admin **không** thêm trạm 7.
- **Dual maps gỡ:** FlowMap / Incident print / su-co taxonomy / analytics / report filters / waiting verbs đọc SSOT.

## Parked

1. **TEXT persist ADR** — đổi fact cột sang `ma_tram` text (bỏ FK UUID) + migrate data.
2. **W3c / draft QLCV migrate `20260926053300`** — file only, chưa apply remote.
3. Đổi nhãn seed DB `ten_tram` cho khớp SSOT (optional sync) — không bắt buộc vì UI không còn phụ thuộc `ten_tram` cho 6 mã.

## UAT checklist

- [ ] Hub `/quan-tri-he-thong/danh-muc/chuyen-biet/TRAM_CSSD`: banner khóa, không nút thêm/sửa/Excel.
- [ ] Gọi upsert/import generic `TRAM_CSSD` (devtools) → lỗi «chỉ xem».
- [ ] Flow map + sự cố form/print: QC hiển thị **Kiểm bộ** (không còn map lệch «Kiểm tra chất lượng (QC)»).
- [ ] Quét workflow / ghi fact vẫn resolve UUID tram (không regression persist).
- [ ] Vẫn đúng 6 trạm — không xuất hiện mã thứ 7 trên UI.
