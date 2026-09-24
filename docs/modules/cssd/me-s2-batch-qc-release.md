# ME-S2 — Phiếu mẻ: máy, chương trình, QC, nhả

Một lát trên nhánh S1. Không gồm truy vết thu hồi, in phiếu, UX nhãn.

## Máy và mã mẻ

- Dropdown chỉ máy có phương pháp `HOI_NUOC` | `PLASMA_H2O2` | `EO`, suy từ mã `LOAI_MAY_TIET_KHUAN` (`getSterilizerMethod`). Không regex tên máy.
- Mã mẻ sinh trong `rpc_cssd_me_tao`: `<mã máy rút gọn>-ddMMyy-n` theo lịch Việt Nam.

## QC và BI

- Kết thúc mẻ: thông số vật lý, CI ngoài gói, CI PCD — mỗi mục Đạt hoặc Không đạt. Thiếu hoặc chưa đánh giá thì server từ chối.
- Một mục Không đạt hoặc BI dương → `QC_KHONG_DAT` (BI dương đi sự cố `PROCESS_BI_POSITIVE`).
- BI bắt buộc (plasma, EO, hoặc bộ `is_implant`) mà chưa có kết quả → `CHO_BI`. Bộ ở lại trạm tiệt khuẩn.
- Hơi nước không implant: BI chưa có vẫn nhả; nhắc nếu máy chưa có BI trong 7 ngày.
- `ket_qua_bi` / `ket_qua_ci` để trống khi chưa có kết quả — không ghi `false`.

## Nhả và cấp phát

- Nhả (`HOAN_THANH`) chuyển bộ sang trạm cấp phát (kho vô khuẩn) và gán hạn dùng. Không ghi `thoi_gian_cap_phat` / `nguoi_cap_phat_id`.
- Người nạp, người dỡ, người nhả là user phiên, giờ server.
- Nhả mẻ thường: quyền `CSSD_ME_TIET_KHUAN.edit`. Nhả mẻ implant hoặc nhập BI cho `CHO_BI`: quyền `qc`.
- Cổng cấp phát: mẻ `HOAN_THANH`, không `CHO_BI`, không sự cố tiệt khuẩn đang mở hoặc đã xác nhận gắn mẻ/bộ.

## Bowie–Dick

- Chỉ máy hơi nước. Ghi người và giờ vào `specs`. Không đạt thì chặn tạo mẻ hơi nước đến khi có BD đạt mới.

## Schema

Migration `20260925100000_cssd_me_s2_qc_release.sql` (additive). Migration S1 đổi timestamp `20260925090000` để không trùng kiểm kê. Index một mẻ mở/máy bỏ qua dữ liệu cũ trùng, không xóa dòng; mẻ `CHO_BI` không khóa máy.
