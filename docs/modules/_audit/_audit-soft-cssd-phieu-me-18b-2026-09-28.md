# Soft audit — CSSD phiếu mẻ harden 18+18b A×6 — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Ngày | 2026-09-28 (Asia/Saigon) |
| Máy | Nghĩa Mac · `6bad1c57-5c17-4e62-b661-16f3bab10f88` |
| Repo | `/Users/drnghia/Desktop/ksnk_bv103` · tip `cursor/me-sync-recall-print` @ `244ef21`+ |
| Neo | Domain `18` + `18b` PO **A ×6** |
| Không | invent lâm sàng · commit/push/PR · Vercel · prod migrate · đụng WT khác (RIT/age-null/Transfer/used_clinically 23/ensure-chi_tiet/…) |

---

## AB-1…6 status

| AB | Domain A | Soft status | Evidence |
|----|----------|-------------|----------|
| AB-1 | KHÔNG ĐẠT → `TIEP_NHAN` | **DONE** | `recallTargetStationForLotMember` · ME-S3 `rpc_cssd_me_thu_hoi` |
| AB-2 | Implant chưa BI → hard block, no emergency Soft | **DONE** | `evaluateMeQcRelease`→`CHO_BI` · `assertImplantReleaseWithoutBiBlocked` · UI badge · **no** emergency API |
| AB-3 | BI(+) recall conservative mọi PP | **DONE** | `selectBiRecallBatchIds` (no PP filter) |
| AB-4 | Plasma/EO nhả sau BI(−) | **DONE** | `biRequiredForBatch` → `CHO_BI` · `rpc_cssd_me_ghi_cho_bi` / `nhap_bi_am` |
| AB-5 | Sai PP → hard block khi quét | **DONE** | `assertKitFitsSterilizerMethod` on add · RPC `fn_cssd_me_ly_do_lech_phuong_phap` |
| AB-6 | Thường=`edit`; implant/`CHO_BI`=tổ trưởng | **DONE** | `requiresToTruongReleaseRight` → `verifyCssdBatchQc` (`CSSD_ME_TIET_KHUAN.qc`) |

---

## M-01…M-27 P0 — done vs park

| ID | Mức | Soft | Note |
|----|-----|------|------|
| M-01 | P0 | **DONE** | `assertThietBiSanSangChoMeTietKhuan` HOLD_QC/REPAIRING block |
| M-02 | P0 | **DONE** | `formatMeMaLo` / `rpc_cssd_me_tao` máy×ngày VN |
| M-03 | P0 | **DONE** | PP từ `getSterilizerMethod` (loại máy) |
| M-04 | P0 | **DONE** (thin) | `chuong_trinh` text trên phiếu/QC; danh mục chương trình máy = catalog residual |
| M-05 | P0 | **DONE** | VL bắt buộc hơi nước; cột `nhiet_do`/`ap_suat`/`thoi_gian_chu_ky` |
| M-06 | P0 | **DONE** | `nguoi_*_id` / `nguoi_nha_id` từ phiên |
| M-07 | P0 | **DONE** | timestamp hệ thống start/end |
| M-08 | P0 | **DONE** | quét `DONG_GOI`; khóa sau bắt đầu |
| M-09 | P0 | **DONE** | `co_implant` suy từ `is_implant` danh mục |
| M-10 | P0 | **DONE** | `assertSteamDailyBdForLoad` / specs BD |
| M-11 | P0 | **DONE** | BD fail → HOLD_QC + chặn tạo |
| M-12 | P0 | **DONE** | CI ngoài tri-state → fail mẻ |
| M-13 | P0 | **DONE** | CI PCD tri-state |
| M-14 | P0 | **DONE** | BI bắt buộc Plasma/EO/implant |
| M-15 | P0 | **DONE** | `steamBiWeeklyReminder` + UI BI bắt buộc |
| M-16 | P0 | **DONE** | VL fail → `QC_KHONG_DAT` |
| M-17 | P1 | **PARK** | Thẩm định 3 mẻ trống — ngoài slice A×6 |
| M-18 | P0 | **DONE** | Nhả thường → kho vô khuẩn (không stamp CP) |
| M-19 | P0 | **DONE** | Implant → `CHO_BI` |
| M-20 | P0 | **DONE** | = AB-4 |
| M-21 | P0 | **DONE** | = AB-1 toàn mẻ → TN + HOLD_QC |
| M-22 | P0 | **DONE** | SC PROCESS tự tạo từ phiếu mẻ |
| M-23 | P0 | **DONE** | = AB-3 + partition ¬used (Domain 23 WT riêng) |
| M-24 | P0 | **DONE** | `assertPackIssuable` + `loadPackBatchReleaseGate` |
| M-25 | P1 | **PARK** | Retention 5 năm — policy/ops |
| M-26 | P0 | **DONE** | = AB-5 |
| M-27 | P0 | **DONE** | `fn_cssd_me_la_bo_me_sub` chặn bộ mẹ |
| M-28 | P1 | **PARK** | Plasma Tyvek reminder catalog |

---

## Files Soft (slice này)

| Path | Việc |
|------|------|
| `src/modules/cssd-erp/lib/me-tiet-khuan-ab-gates.ts` | NEW · A×6 pure gates |
| `src/modules/cssd-erp/lib/me-tiet-khuan-ab-gates.spec.ts` | NEW · focused tests |
| `src/modules/cssd-erp/helpers/persist-me-tiet-khuan.ts` | AB-2 defense-in-depth |
| `src/modules/cssd-erp/actions/cssd-batch.actions.ts` | AB-6 `requiresToTruongReleaseRight` |
| `src/lib/cssd-server-gates.ts` | comment AB-6 tổ trưởng=`qc` |
| `src/modules/cssd-erp/components/batch/me-tiet-khuan-process-qc-panel.tsx` | AB-2 UI badge |
| `docs/modules/cssd/18-*.md` · `18b-*.md` | mirror Domain |
| `docs/modules/cssd/me-s2-*.md` · `me-s3-*.md` | AB tags |
| `_audit-full-debt-overlap-2026-09-27.md` | Soft Soft-queue beat |

**Left alone:** used_clinically 23 / RIT / age-null / Transfer / ensure-chi_tiet migrate drafts / other WT.

---

## UAT (local Soft)

1. Mẻ hơi nước thường, BI chưa có → nhả được (`edit`).
2. Mẻ implant hoặc Plasma/EO, BI chưa có → `CHO_BI`; **không** có nút nhả khẩn.
3. Nhập BI âm trên `CHO_BI` → cần `qc` (tổ trưởng); bộ sang kho vô khuẩn.
4. Quét bộ nhạy nhiệt vào mẻ hơi nước → hard block.
5. QC_KHONG_DAT / BI(+) → bộ về `TIEP_NHAN`; BI(+) cửa sổ từ BI(−) gần nhất.
6. Cấp phát: `CHO_BI` hoặc SC TK OPEN → block.

## Domain ask

- Confirm Soft map `CSSD_ME_TIET_KHUAN.qc` = tổ trưởng (ops gán RBAC) đủ AB-6, hay cần role code riêng.
- M-04 danh mục chương trình máy: P1 catalog hay giữ text thin.
- M-17 / M-25 / M-28: park OK.

## Soft Soft-queue next

**QLCV Chờ tôi 24** (per Lead).
