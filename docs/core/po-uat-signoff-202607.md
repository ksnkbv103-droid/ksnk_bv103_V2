# Hướng dẫn PO nghiệm thu tay §B — đợt 07/2026

> Dành cho Product Owner (không cần chạy lệnh). Kết quả tick vào **§B của [`pilot-go-live-signoff-202606.md`](./pilot-go-live-signoff-202606.md)**. Phần máy (§A) IT đã chạy pass 2026-07-03.

## Chuẩn bị (1 lần)

1. Đăng nhập bằng tài khoản **KSNK pilot** (không phải tài khoản admin IT).
2. Chuẩn bị thêm 1 tài khoản **khoa lâm sàng** để test kịch bản chặn quyền.
3. Test mobile: dùng điện thoại thật, hoặc nhờ IT bật chế độ giả lập màn hình nhỏ.

## Thứ tự nghiệm thu đề xuất

| Bước | Khối | Checklist | Ước lượng |
|------|------|-----------|-----------|
| 1 | QLCV (6 kịch bản Q1–Q6) | [`pilot-checklist-202606.md`](../modules/qlcv/pilot-checklist-202606.md) | ~30 phút |
| 2 | **QLCV Kanban mobile (M1–M3)** | cùng file trên, mục "Kanban mobile" | ~10 phút |
| 3 | **NKBV clinical (4 kịch bản tay #2–#5)** | [`pilot-clinical-checklist-20260603.md`](../modules/nkbv/pilot-clinical-checklist-20260603.md) — kịch bản #1 đã pass tự động | ~40 phút, cần người khoa KSNK |
| 4 | Các khối còn lại trong §B (GSC/VST, CSSD, Dashboard, MDM) | link trong bảng §B | theo wave |

## Cách ghi kết quả

- Mỗi kịch bản: đạt → tick; không đạt → ghi ngắn *hiện tượng thấy trên màn hình* (chụp ảnh càng tốt), gửi lại chat Cursor để sửa.
- Một khối đạt khi **≥ 5/6** kịch bản pass (NKBV: ≥ 4/5, Kanban mobile: 3/3).
- Xong khối nào điền cột **Pass / Tester / Ngày** của khối đó trong §B.

## Việc còn chờ PO (ngoài nghiệm thu)

| Việc | Vì sao cần PO |
|------|---------------|
| Cấp token Supabase mới (Dashboard → Account → Access Tokens) | Token cũ hết hạn — IT chưa kiểm tra được dữ liệu môi trường staging/linked (Đợt 3b) |
| Ký §E sau khi §B đủ | Điều kiện go-live W1 |
