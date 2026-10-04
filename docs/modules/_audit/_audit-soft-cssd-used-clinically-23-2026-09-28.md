# Soft — CSSD `used_clinically` Domain 23=A / CSSD-L07 — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Ngày | 2026-09-28 (Asia/Saigon) |
| Máy | Nghĩa Mac · `6bad1c57-5c17-4e62-b661-16f3bab10f88` |
| Repo | `/Users/drnghia/Desktop/ksnk_bv103` · tip `244ef21` + Soft slice **uncommitted** |
| Branch | `cursor/me-sync-recall-print` |
| Neo | `docs/modules/cssd/23-CSSD-USED-CLINICALLY-AB-20260928.md` · backlog CSSD-L07 · 17 §17.3 · 17d G-P0-05 · 18 M-23 · **Domain chốt A** |
| Không | commit / push / PR / Vercel / prod migrate · **không** harden phiếu mẻ AB-1…6 / L08 ledger · **không** đụng RIT/age-null/Transfer WT |

## Behavior (DoD Soft)

1. **Set `used_clinically` chỉ qua explicit event** (`used_clinically` + `used_clinically_at` + `used_clinically_by` + `used_clinically_source`) — `markCssdUsedClinically` / `assignCssdCaMoTrace` (CLINICAL) / manual toggle (MANUAL fallback).
2. **Không** silent-set trên print CAP_PHAT; CAP_PHAT scan/workflow có thể ghi `ma_ca_mo_id` trace nhưng **không** set used (cấp ≠ dùng).
3. **SC picker** `/cssd-su-co` incident: `listBoForSuCoPickerAction` = chu trình mở ∧ `tram` ∈ 6 ∧ ¬used (§17.3). CAP_PHAT còn IN đến khi used. Luân chuyển giữ catalog.
4. **Recall BI+ (M-23):** ¬used → thu hồi; used → list đánh giá KSNK. TS `partitionRecallMembers` / print `xuLyLabel` dùng event; **draft migrate** `20260928024100_cssd_used_clinically_recall.sql` patch `rpc_cssd_me_thu_hoi` (await Lead apply; depends ME-S3).
5. **Manual toggle** trên Truy vết = fallback khi thiếu khoa/PM — không thay event A (CLINICAL/ca mổ) làm SoT.
6. **Anti-invent:** `ma_ca_mo_id` một mình **không** còn nghĩa used.

## Files

| Path | Việc |
|------|------|
| `domain/cssd-used-clinically.ts` + `.spec.ts` | Event parse/build · SC whitelist · truth |
| `domain/cssd-batch-recall.ts` + `.spec.ts` | Re-export truth; partition M-23 |
| `application/mark-used-clinically.application.ts` | Write event via metadata merge |
| `actions/cssd-used-clinically.actions.ts` | Server action + actor |
| `actions/su-co-bo-picker.actions.ts` | `listBoForSuCoPickerAction` |
| `components/SuCoReportForm.tsx` | Incident → whitelist picker |
| `cssd-erp/.../cssd-qr-history.actions.ts` | Ca mổ = CLINICAL event |
| `cssd-erp/.../QRHistoryViewer.tsx` | Status + manual toggle |
| `cssd-erp/lib/cssd-print-format.ts` (+spec) | xuLyLabel M-23 |
| `cssd-erp/actions/cssd-batch.actions.ts` | Members enrich used from metadata |
| `cssd-erp/actions/cssd-print.actions.ts` | Pass used into xuLy |
| `cssd-erp/actions/cssd-scan.actions.ts` · workflow | Comment: no used on CAP_PHAT |
| `application/batch-recall-hold.application.ts` | Read used fields from RPC |
| `supabase/migrations/20260928024100_cssd_used_clinically_recall.sql` | **Draft** — Soft không apply |
| `docs/modules/cssd/23-…` | DoD mirror |
| Full-debt Soft Soft-queue beat | This slice DONE Soft-local |

## Spec / UAT

- Vitest focused: `cssd-used-clinically.spec` · `cssd-batch-recall.spec` · `cssd-print-format` Domain 23.
- `tsc --noEmit` clean on touched surface.
- UAT (sau Lead apply migrate recall nếu cần RPC):
  1. CAP_PHAT print/scan → **không** used; picker vẫn thấy bộ CAP_PHAT.
  2. Truy vết lưu ca mổ → used + actor/ts; picker **OUT**; BI+ recall → list KSNK (không thu hồi).
  3. Manual toggle fallback khi thiếu ca mổ → cùng cờ; gỡ manual → lại IN picker.
  4. `ma_ca_mo_id` cũ không event → vẫn thu hồi được (không invent).

## Domain ask

- **None for 23** (Domain A already). Soft Soft-queue **next** = phiếu mẻ harden **18+18b A×6** (AB-1…6) — **không** trong lát này.
- Park: Lead apply `20260928024100` (+ ME-S3 nếu chưa); khoa/PM tích hợp event (ngoài Soft manual/CLINICAL); L08 ensure-chi_tiet await Lead.
