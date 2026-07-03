# QLCV KSNK-only — intake reform 2026-06

> **Invariant:** Module Quản lý công việc chỉ phục vụ **Khoa Kiểm soát nhiễm khuẩn (KSNK)** — nhân viên KSNK thực hiện, không giao việc liên khoa lâm sàng.

## Phạm vi

| Có | Không |
|----|-------|
| Việc nội bộ KSNK | Giao việc cho NV khoa Ngoại/Nội/… |
| NV `mdm_nhan_su.khoa_id` = KSNK | User khoa khác truy cập module |
| `khoa_thuc_hien_id` luôn = KSNK | Chọn khoa trên form/import |

## Migration

`20260617120000_qlcv_ksnk_only_scope.sql` — xóa phiếu giao ngoài KSNK, backfill khoa, NOT NULL.

## Checklist tay (thay Q6 cũ)

| # | Kịch bản | Pass khi |
|---|----------|----------|
| K1 | Tạo việc KSNK | Chỉ chọn NV KSNK; `khoa_thuc_hien_id` = KSNK |
| K2 | NV khoa khác | 403 / không vào module |
| K3 | Nghiệm thu | Chỉ khi 100% / CHO_DUYET |
| K4 | Import | Không cột khoa; từ chối ma_nv ngoài KSNK |
| K5 | Phê duyệt đề xuất | Dialog `DeXuatApproveForm` — chọn tổ + phụ trách |
| K6 | Việc của tôi | Thẻ lọc chỉ hiện việc giao cho tôi + đề xuất của tôi |

## Phase 2 (2026-06-17)

- RPC: `fn_qlcv_transition` — nghiệm thu, từ chối, hủy, phê duyệt đề xuất
- RLS: authenticated chỉ SELECT phiếu KSNK; ghi qua service_role
- UI: `DeXuatApproveForm`, filter `MY_TASKS`

## Code SSOT

- Domain: `src/lib/domain/qlcv/ksnk-boundary.ts`, `nghiem-thu-gate.ts`
- Server: `qlcv-ksnk-server.ts`, `qlcv-action-guard.ts`
- Scope: `qlcv-list-scope.ts` (filter `khoa_thuc_hien_id = KSNK`)
