# 19c — QLCV tối giản toàn diện (PO Nghĩa 2026-09-26)

| Trường | Giá trị |
|--------|---------|
| Phiên bản | v1.0 · 2026-09-26 |
| Trạng thái | **PO Nghĩa chốt gói A** 2026-09-26 04:20 +07 — Lead triển khai local |
| Neo | Bổ sung `19` + `19b`. Không sửa code. |
| Thanh PO | Việc gì · ai phụ trách · hạn · tiến độ · kết quả · nằm trong nhiệm vụ/kế hoạch nào · ít field · định kỳ khoa học nếu cần |

## §1. Sáu câu quan sát (mọi phiếu mở)

1. Việc gì (`tieu_de` — động từ + đầu ra)
2. Ai phụ trách (`nguoi_phu_trach_id` — đúng **1**)
3. Hạn (`han_hoan_thanh`)
4. Tiến độ (`%` / checklist / nhóm TT)
5. Kết quả đạt được (ghi chú/đính kèm ngắn khi đóng)
6. Nằm trong đâu (`nhiem_vu_id` optional → 1 tầng container «Nhiệm vụ/Kế hoạch»)

## §2. Form tạo (càng ít càng tốt)

**Bắt buộc:** tiêu đề · người phụ trách · hạn (đột xuất/khẩn).  
**Optional nổi:** phối hợp (chip) · gắn Nhiệm vụ/Kế hoạch.  
**Ẩn / Thêm chi tiết:** mô tả, địa điểm, vị trí, tổ, theo dõi, ưu tiên.  
**Không bắt buộc:** chức vụ như field phiếu.

## §3. Việc định kỳ — Domain khuyến nghị: **CẦN**, nhưng hẹp

**Nên:** nhịp ổn định + cùng người/checklist (VD giám sát VST ngày, kiểm khoa tuần, báo cáo tháng).  
**Không nên:** việc phát sinh, chỉ nhắc miệng, mỗi lần phải lập kế hoạch mới.  
**Cách làm:** mẫu bất biến + spawn idempotent `(mau, kỳ)` · không sinh cả năm trước · đủ checklist → tự hoàn thành (giữ 19) · ghi kết quả từng kỳ · có ngày dừng.  
**Không** tái dùng một bản ghi mãi (mất lịch sử kỳ).

## §4. Container

Giữ **1 tầng** `NhiemVu` (= nhiệm vụ/kế hoạch/dự án khoa). Không tách Plan vs Project trừ khi sau này cần báo cáo cấp viện. FK optional lúc tạo; list lọc theo container.

## §5. A/B (Lead lấy A nếu không chọn)

| # | A (khuyến nghị) | B |
|---|-----------------|---|
| TAC-1 | Giữ việc định kỳ (mẫu+spawn hẹp) | Tắt định kỳ; chỉ việc thường |
| TAC-2 | 1 tầng Nhiệm vụ/Kế hoạch (giữ `NhiemVu`) | Bỏ container; chỉ list việc phẳng |
| TAC-3 | Đóng việc: bắt buộc 1 dòng kết quả (hoặc checklist đủ = kết quả) | Đóng chỉ đổi TT, không bắt kết quả |
| TAC-4 | Form tạo = 19b A (ít field) | Giữ form đầy đủ hiện tại |

## Applied A (local tip)

| Trường | Giá trị |
|--------|---------|
| Chốt | TAC-1A+2A+3A+4A (Nghĩa 2026-09-26 04:20 +07) |
| Branch | `cursor/me-sync-recall-print` |
| Base | 19b A @ `cbba99d` — **không redo** |
| Commit | tip `feat(qlcv): 19c A — close requires result, NV optional, periodic narrow` (xem `git log -1`) |
| TAC-4A | Form ít field — đã có từ 19b (`Thêm chi tiết`) |
| TAC-2A | `nhiem_vu_id` optional nổi «Gắn Nhiệm vụ/Kế hoạch» trên form tạo (không chôn trong Thêm chi tiết) |
| TAC-3A | Nghiệm thu/đóng: bắt buộc 1 dòng kết quả **hoặc** checklist 100%; soft FE (`QlcvReasonDialog`) + action `xacNhanHoanThanh(id, ketQua?)`; nhật ký `Kết quả: …`; **không migrate** (không cột ket_qua riêng) |
| TAC-1A | Định kỳ hẹp giữ nguyên: mẫu bất biến + spawn idempotent `(mau, han_hoan_thanh=CURRENT_DATE)` · chỉ hôm nay · auto HOAN_THANH khi đủ checklist · **ngày dừng = `is_active=false`** (không thêm cột `ngay_dung`) |
| List/detail | 6 câu: tiêu đề · người thực hiện · hạn · tiến độ · kết quả khi HOAN_THANH · NV/KH container |
| Verify | `tsc --noEmit` + vitest `close-requires-result` + qlcv dinh-ky specs |
| Không | push / Cloud / migrate / main |
