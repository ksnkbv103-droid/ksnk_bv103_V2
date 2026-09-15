> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`modules/cssd/README.md`](../../../modules/cssd/README.md). Tra cứu lịch sử được.

# Đợt A — Implant CHO_BI + Đợt B — CTA/FSM copy (09/09/2026)

> **Máy:** Mac `Desktop/ksnk_bv103` · machineId `6bad1c57-…0f88`  
> **Phạm vi:** LOCAL ONLY · không commit/push · UI/docs tiếng Việt thường · Dialog UX · diff nhỏ.  
> **Nền:** domain `cssd-cho-bi` + `assertPackIssuable` đã có mầm; audit roadmap ghi QT-IMPLANT / DC-DUAL / SC-FSM còn mở.

---

## Đợt A — Implant / quarantine CHO_BI + chặn cấp phát

### Mục tiêu

Mẻ **cấy ghép** mà BI chưa ĐẠT phải vào cách ly `CHO_BI` và **không cấp phát** cho đến khi gỡ (BI ĐẠT / admin «Gỡ chờ BI»). Không ảnh hưởng mẻ không implant.

### Wire end-to-end (đã nối / hoàn thiện)

| Bước | Cơ chế | File chính |
|------|--------|------------|
| **Write** | Tick «Mẻ cấy ghép» + BI ≠ ĐẠT → `stampChoBiOnQcJson` (`quarantineStatus=CHO_BI`) trên `tk_qc_json`; `is_dong_bang=true` trên bộ trong mẻ | `persist-me-tiet-khuan.ts` · `cssd-cho-bi.ts` · QC panel |
| **Hard gate** | `assertPackIssuable({ is_cho_bi })` trước scan/handoff `CAP_PHAT` — message VN cố định | `cssd-pack-issuance.ts` · `cssd-scan.actions.ts` · `cssd-workflow-application.ts` |
| **Release** | «Gỡ chờ BI» → `persistReleaseChoBiAfterBiDat` (chỉ mẻ ĐẠT QC + đang implant/CHO_BI) → xóa stamp + mở `is_dong_bang` | `cssd-batch.actions.ts` · cột danh sách mẻ |
| **Audit** | Exception `CHO_BI_QUARANTINE` khi khóa; `CHO_BI_RELEASED` khi gỡ | `persist-me-tiet-khuan.ts` |
| **UI mẻ** | Trạng thái «Chờ BI» + nút gỡ | `me-tiet-khuan-list-data.ts` · `me-tiet-khuan-columns.tsx` |

### Message chặn (VN)

`CHO_BI_CAP_PHAT_BLOCK_MSG` = *«Bộ cấy ghép đang chờ BI âm — không cấp phát cho đến khi BI ĐẠT.»*

### Non-implant

`shouldQuarantineChoBi({ isImplant: false, … })` luôn `false` — mẻ thường không bị khóa vì BI = NA/Bỏ qua.

### Vitest

- `src/lib/domain/cssd-cho-bi.spec.ts` — quarantine / stamp / clear / gate + non-implant  
- `src/lib/domain/cssd-pack-issuance.spec.ts` — block `is_cho_bi`  
- Chạy: **23** test domain liên quan A/B pass (cho-bi + pack + catalog-fsm)

### AC Đợt A

- [x] Implant + BI chưa ĐẠT → stamp CHO_BI + đóng băng bộ  
- [x] Quét / handoff CAP_PHAT bị chặn message VN rõ  
- [x] Gỡ sau BI ĐẠT → cấp phát lại được  
- [x] Vitest gate helpers  
- [x] Non-implant không bị khóa vì BI NA  

---

## Đợt B — CTA dual surface + FSM rõ 3 trục

### Mục tiêu

Giảm nhầm cửa: **xem / đề xuất / duyệt** và phân biệt **xác nhận phiếu sự cố ≠ duyệt danh mục L1 ≠ duyệt lại L2**.

### Copy SSOT (`cssd-catalog-approve-fsm.ts`)

| Constant | Nội dung ngắn |
|----------|----------------|
| `CATALOG_DUAL_APPROVE_COPY` | Duyệt danh mục L1 (NV) → Duyệt lại L2 (Admin) → vào DM chính — khác «Xác nhận phiếu sự cố» |
| `CATALOG_FSM_THREE_AXES_COPY` | Xác nhận phiếu sự cố (four-eyes) ≠ Duyệt danh mục L1 (NV) ≠ Duyệt lại L2 (Admin) |
| `CATALOG_SURFACE_RO_COPY` | Chỉ xem / đề nghị · Sửa master → Quản trị · Duyệt → Rà soát |
| `CATALOG_SURFACE_SU_CO_DOI_DM_COPY` | Cửa Đổi danh mục: gửi đề nghị — không sửa master |
| `CATALOG_SURFACE_QT_MASTER_COPY` | Quản trị: xem + sửa (ADMIN khẩn) · Đề xuất · Duyệt ở Rà soát |
| `CATALOG_SURFACE_HYBRID_QUEUE_COPY` | Rà soát: duyệt đề xuất / đổi DM — L1 rồi L2 |

### Surface chạm

- CSSD RO `/cssd-dung-cu` — banner xem/đề xuất/duyệt  
- `CSSDCatalogQuickActions` — cửa Đổi danh mục  
- QT `QuanLyDungCuPage` + `SetReconcileApproveQueue` — nhãn **Duyệt L1 (NV)** / **Duyệt lại L2** + 3 trục  
- `CatalogProposalDialog` · `bo-dung-cu-chi-tiet-panel` tip  
- Sự cố: `IncidentConfirmButton` «Xác nhận phiếu sự cố» · modal 3 cửa · success copy  

### AC Đợt B

- [x] 4 cửa có 1 câu CTA/copy ngắn  
- [x] UI phân biệt four-eyes ≠ L1 ≠ L2  
- [x] Không mega redesign  

---

## Roadmap status (cập nhật)

| ID | Trước | Sau đợt này |
|----|-------|-------------|
| QT-IMPLANT / #2 opt debt | OPEN | **FIXED** local (write+gate+release+test) |
| DC-DUAL | PARTIAL | **PARTIAL→improved** (CTA/copy) |
| SC-FSM | OPEN | **PARTIAL** (copy 3 trục; form vẫn dày) |

Chi tiết delta: [`_agent-project-optimization-debt-roadmap-20260909.md`](./_agent-project-optimization-debt-roadmap-20260909.md).

---

## Không làm

- Commit / push / cloud agent  
- Đổi schema enum CHO_BI  
- Hard-block BOM cấp phát / 3×BI auto mở máy (P2)  

*Boy Scout: hoàn thiện wire sẵn có + copy ngắn — không nhân cổng song song.*
