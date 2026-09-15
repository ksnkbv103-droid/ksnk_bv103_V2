# Wave 2 — vá nợ tối ưu (tem in lại · SuCo · shell · NKBV lazy)

> **Ngày:** 2026-09-09 (Asia/Saigon) · **Máy:** Mac `Desktop/ksnk_bv103` · machineId `6bad1c57-…0f88`  
> **Phạm vi:** LOCAL ONLY · không commit/push · UI tiếng Việt thường · Dialog UX · diff nhỏ.  
> **Nền:** `_agent-project-optimization-debt-roadmap-20260909.md` (OPEN còn lại sau Đợt A/B implant+CTA).

---

## Đã ship đợt này

### 1) QT-TEM — In lại tem chu trình (Kho + Trace) · **FIXED**

| Chỗ | Thay đổi |
|-----|----------|
| Nút dùng chung | `src/modules/cssd-erp/components/labels/CssdCycleLabelReprintButton.tsx` — gọi `fetchCssdCycleLabelData` + `printCycleLabel` (mã, mẻ, HSD, người ĐG, ngày) |
| Kho | `KhoDungCuPage` — icon Tag cạnh in phiếu cấp phát; disable khi chưa có `ma_cycle_qr` |
| Trace | `QRHistoryViewer` — nút full-width «In lại tem chu trình» khi có quy trình |

**AC:** Ca trực in lại từ Kho/Trace không cần quét lại trạm Đóng gói.

### 2) SC-FORM — Form sự cố residual lazy · **PARTIAL→improved**

| Việc | Chi tiết |
|------|----------|
| Trì hoãn catalog nặng | Staff load ngay; máy/hóa chất chỉ khi nhóm BATCH/EQUIPMENT/CHEMICAL (`needsHeavyCatalog`) |
| Cắt remount | Bỏ `key={physical\|catalog}` trên `InstrumentSetReconcileTable`; reset state theo `doorMode` trong bảng |
| Không đổi taxonomy | Giữ 3 cửa / checklist / FSM copy Đợt B |

Form vẫn ~1100 dòng orchestration — island field đã dynamic từ trước; residual đã cắt payload mở nhóm PROCESS.

### 3) Shell RBAC / offline residual · **PARTIAL→improved**

| Việc | Chi tiết |
|------|----------|
| Đo nhanh | Batch 8.1 (RBAC TTL/stale) + 8.2 (`offline-sync-scope`) đã có; còn `SupervisionOfflineSyncListener` **static import** trong layout |
| Vá | Dynamic import listener GS (giống `OfflineSyncManager`) — không hydrate chunk offline GS trên mọi trang |

RBAC full matrix cold-path giữ (Sidebar cần gate nav) — không đụng schema.

### 4) NKBV first lazy cut · **PARTIAL** (1 slice đo được)

| Việc | Chi tiết |
|------|----------|
| Hook | `useServerPaginatedTable` thêm `enabled?: boolean` — không fetch khi tab chưa mở |
| Page | `GiamSatNkbvPage`: `enabled: mainTab === "cases"`; tab mặc định vẫn **records** |
| Đo | Mở `/giam-sat-nkbv` mặc định **không** gọi `listGiamSatNkbvCas` đến khi bấm «Danh sách phiếu» |

**Next (không làm wave này):** lazy thêm filter DM bundle theo tab cases; tách file workspace >1.5k; island hội chứng theo loại.

---

## Kiểm thử

| Kiểm | Kết quả |
|-------|---------|
| Vitest | `cssd-cycle-label-html.spec` + `offline-sync-scope.spec` — **7/7 pass** |
| `tsc --noEmit` (touched) | Không lỗi mới trên file wave này; lỗi sẵn có `cssd-cho-bi.ts` / nkbv-ruled-out.spec / nkbv-rules-engine.spec (ngoài phạm vi) |

---

## Roadmap IDs cập nhật

| ID | Trước | Sau |
|----|-------|-----|
| QT-TEM (nút in lại) | OPEN | **FIXED** local |
| SC-FORM | OPEN | **PARTIAL** (lazy catalog + cắt remount; form vẫn dày) |
| Offline GS hydrate shell | OPEN | **PARTIAL→improved** (dynamic listener) |
| NKBV mega-surface | OPEN | **PARTIAL** (1 slice: defer cases list) |
| #7 Top-10 in lại tem | OPEN | **FIXED** |
| #5 Shell RBAC/offline | OPEN | **PARTIAL** |
| #1 / #3 form / NKBV | OPEN | **PARTIAL** |

---

## Không làm

- Commit / push / cloud  
- Rewrite NKBV 49k · redesign taxonomy sự cố · cascade chi tiết bộ inactive (chưa chốt PO)  
- Menu-scoped RBAC snapshot (Sidebar vẫn cần full gate)

---

*Boy Scout: tái dùng helper in tem sẵn có · defer fetch · dynamic offline — không nhân cổng.*
