# Soft audit — 25b AB-6 verify · M-04 thin · M-17/25/28 park — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Ngày | 2026-09-28 ~07:20 ICT |
| Tip | `7f0fc61` + Soft Soft Soft-local WT (no commit) |
| Neo | `25b-CSSD-ME-QC-M04-PARK-AB-20260928.md` Domain A |

## AB-6 — verified Soft Soft Soft-safe (không đổi PO A×6)

| Check | Tip evidence |
|-------|----------------|
| Nhả thường = `edit` | `finishCssdSterilizationBatch`: `needsQc=false` → `verifyCssdBatchEdit()` |
| Implant HOAN_THANH / CHO_BI release = tổ trưởng (`qc`) | `requiresToTruongReleaseRight` · `needsQc=true` → `verifyCssdBatchQc()` |
| Không gộp mọi QC = tổ trưởng | Spec `AB-6: tổ trưởng right for implant HOAN_THANH and CHO_BI release only` |

**Kết luận:** AB-6 A đã đúng trên tip — Soft không harden thêm.

## M-04 — IMPLEMENTED thin (Domain A) Soft Soft Soft-local

| DoD | Soft Soft Soft-safe |
|-----|---------------------|
| MDM/máy catalog tối thiểu | Draft migrate `cssd_dm_chuong_trinh_may` (**empty** — không invent list viện). FE cũng đọc `specs.chuong_trinh_catalog`. |
| Tạo phiếu bắt chọn CT | Create step select bắt buộc; `createSterilizationBatchSchema.chuongTrinh` min 1; pass `p_chuong_trinh`. Default = gần nhất máy / phần tử đầu. |
| Prefill nhiệt/áp/thời gian | `prefillFromChuongTrinh`; NV sửa → `buildChuongTrinhEditAudit` trong `tk_qc_json`. |
| Không invent CDC | Fallback mẫu **chỉ** QT21 HD.03 đã neo file 18 M-05 (134/121 · plasma ngắn/dài · EO ấm/lạnh). |

**Park phần:** full catalog viện / số máy cụ thể BV103 — chờ MDM điền bảng hoặc specs.

## M-17 / M-25 / M-28 — PARK P1 (không code)

## Paths
- `supabase/migrations/20260928071000_cssd_dm_chuong_trinh_may_thin.sql`
- `src/modules/cssd-erp/lib/me-tiet-khuan-chuong-trinh.ts` (+ `.spec.ts`)
- create/process/QC steps · workflow · `cssd-batch.actions` · validations · persist audit

## Không
Reopen 18b; invent CDC; commit/push; prod migrate APPLY.
