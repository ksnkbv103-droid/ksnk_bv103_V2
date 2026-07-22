# Hướng dẫn PO nghiệm thu tay §B — đợt 07/2026

> Dành cho Product Owner (không cần chạy lệnh). Kết quả tick vào **§B của [`pilot-go-live-signoff-202606.md`](./pilot-go-live-signoff-202606.md)**. Phần máy (§A) IT đã chạy pass 2026-07-03 / re-verify 2026-07-09.  
> **Gói đóng W1 (IT + PO):** [`../reference/guides/w1-go-live-execution-pack-20260722.md`](../reference/guides/w1-go-live-execution-pack-20260722.md).

## Chuẩn bị (1 lần)

1. Đăng nhập bằng tài khoản **KSNK pilot** (không phải tài khoản admin IT).
2. Chuẩn bị thêm 1 tài khoản **khoa lâm sàng** để test kịch bản chặn quyền.
3. Test mobile: dùng điện thoại thật, hoặc nhờ IT bật chế độ giả lập màn hình nhỏ.
4. Nhờ IT làm mục A trong gói W1 (token Supabase + `trial:auth:precheck` = 0) trước khi ký §E.

## Thứ tự nghiệm thu đề xuất

### Wave 1 — đóng go-live (làm trước)

| Bước | Khối | Checklist | Ước lượng |
|------|------|-----------|-----------|
| 1 | QLCV (6 kịch bản Q1–Q6) | [`pilot-checklist-202606.md`](../modules/qlcv/pilot-checklist-202606.md) | ~30 phút |
| 2 | **QLCV Kanban mobile (M1–M3)** | cùng file trên, mục "Kanban mobile" | ~10 phút |
| 3 | GSC + VST | [`pilot-checklist-202606.md`](../modules/giam-sat/pilot-checklist-202606.md) | ~40 phút |
| 4 | MDM / Quản trị | [`../modules/mdm/README.md`](../modules/mdm/README.md) § Pilot | ~25 phút |

**Go-live W1** khi 3 khối trên ≥5/6 + IT auth = 0 + ký §E. Không chờ CSSD/NKBV/Dashboard.

### Wave 2–3 — sau W1

| Bước | Khối | Checklist | Gói |
|------|------|-----------|-----|
| 5 | CSSD P3–P5 | link trong §B | [`w2-cssd-uat-pack-20260722.md`](../reference/guides/w2-cssd-uat-pack-20260722.md) |
| 6 | **NKBV clinical (#2–#5)** | [`pilot-clinical-checklist-20260603.md`](../modules/nkbv/pilot-clinical-checklist-20260603.md) | [`w3-nkbv-dashboard-enablement-20260722.md`](../reference/guides/w3-nkbv-dashboard-enablement-20260722.md) |
| 7 | Dashboard | [`../modules/dashboard/README.md`](../modules/dashboard/README.md) | cùng gói W3 |

## Cách ghi kết quả

- Mỗi kịch bản: đạt → tick; không đạt → ghi ngắn *hiện tượng thấy trên màn hình* (chụp ảnh càng tốt), gửi lại chat Cursor để sửa.
- Một khối đạt khi **≥ 5/6** kịch bản pass (NKBV: ≥ 4/5 tay #2–#5, Kanban mobile: 3/3).
- Xong khối nào điền cột **Pass / Tester / Ngày** của khối đó trong §B.

## Việc còn chờ PO (ngoài nghiệm thu)

| Việc | Vì sao cần PO |
|------|---------------|
| Cấp token Supabase mới (Dashboard → Account → Access Tokens) | Token cũ hết hạn — IT chưa kiểm tra được dữ liệu môi trường staging/linked |
| Ký §E sau khi §B **W1** đủ | Điều kiện go-live W1 — xem gói W1 §C |
