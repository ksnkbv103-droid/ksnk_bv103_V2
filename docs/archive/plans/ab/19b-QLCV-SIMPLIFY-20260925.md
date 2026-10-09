# 19b — QLCV Simplify Applied A · 2026-09-25

| Trường | Giá trị |
|--------|---------|
| Trạng thái | **Applied A** (Domain 19 + Lead proposal; Nghĩa skip widget → default A) |
| Branch tip | `cursor/me-sync-recall-print` (commit feat simplify A) |
| Neo | `19-QLCV-DOMAIN-SSOT.md` · `docs/ux/_proposal-qlcv-simplify-2026-09-25.md` |
| Phạm vi | FE-first · không DB migrate · không push/Cloud |

## Locked Domain A (đã triển khai)

1. **Create required:** `tieu_de` + 1 Người thực hiện (`nguoi_phu_trach_id`) + `han_hoan_thanh` khi `loai_cong_viec` ∈ `DOT_XUAT` | `KHAN_CAP`.
2. **Optional:** N Phối hợp (`nguoi_phoi_hop_ids` chips), mô tả; `dia_diem_khoa_id` · `vi_tri_thuc_hien` · theo dõi · tổ · nhiệm vụ · ưu tiên — sau «Thêm chi tiết».
3. **List / Điều hành / Kanban:** primary = người thực hiện (initials + tên); secondary = chip Phối hợp (không C/I cryptic).
4. **Stats MVP:** số việc · % hoàn thành · % quá hạn (Gate strip + Báo cáo header).
5. **7 mã trạng thái** backend giữ nguyên; UI có thể group.
6. **FE-first:** cột soft-optional giữ DB (`dia_diem_khoa_id` nullable ở Zod/FE).

## Stats nguồn

| Số | Nguồn |
|----|-------|
| Gate chips (Của tôi / Cần làm / Quá hạn / Chờ tôi) | `rpc_qlcv_board_counts` (+ fallback client) |
| MVP tổng · % HT · % quá hạn | **Client** từ rows đã tải (`computeQlcvMvpStats` / aggregate `theoNguoi`) — RPC hiện **không** trả 3 số này |

## Commit message

`feat(qlcv): simplify A — assignee-first, optional dia_diem, stats MVP`
