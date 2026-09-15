> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`modules/mdm/README.md`](../../../modules/mdm/README.md). Tra cứu lịch sử được.

# Đánh giá + cleanup Quản trị hệ thống (2026-09-07)

> Đối tượng: admin bệnh viện CSSD/KSNK, **1 quản trị viên**. Ngôn ngữ: tiếng Việt thường.

## Kết luận ngắn

Module **đủ dùng và logic** cho vận hành hàng ngày (danh mục, nhân sự, bảng kiểm, tài khoản, phân quyền). Luồng tài khoản đã gộp về một cửa sống. Chưa «khoa học đầy đủ» ở lớp audit / bảo mật 1-admin nâng cao — chấp nhận được nếu ưu tiên ổn định UX trước.

## Điểm mạnh

1. **Hub việc rõ:** bốn việc (Tổ chức, Bảng kiểm, Master CSSD, Tài khoản & truy cập) + catalog danh mục — admin biết đi đâu.
2. **Một cửa tài khoản:** hub `/tai-khoan` điều hướng; hành động tạo/reset/duyệt phiếu trên **Nhân sự**; Guest pilot trên hub.
3. **Re-auth admin** khi đổi MK người khác — phù hợp 1 admin, giảm nhầm nút.
4. **Sức khỏe hệ thống** báo nhân sự chưa TK / khoa thiếu khối / bộ thiếu mã / bảng kiểm thiếu áp dụng — hữu ích CSSD+KSNK.
5. **Phiếu xin cấp / quên MK** + bảng `sys_account_access_request` (dual-write soft) — có hàng đợi, không chỉ «admin nhớ tay».

## Khoảng trống

1. **1 admin vẫn rủi ro:** quên MK admin / tự reset hồ sơ mình — chưa có quy trình cứng (email recovery / break-glass) rõ ràng trên UI.
2. **Audit còn mỏng:** có append metadata một phần; chưa có sổ audit đọc được trên UI.
3. **Tên thư mục / API** vẫn `tai-khoan-nhan-su` trong khi UX gọi «Tài khoản & truy cập» — dễ lẫn khi đọc code.
4. **Guest pilot** gắn cứng email/pilot — ổn thử nghiệm, chưa phải mô hình khách đa đơn vị.
5. **Phân quyền vs Nhân sự:** gán vai trò có thể lệch chỗ (form NS vs ma trận) nếu admin không đọc gợi ý hub.

## Việc còn lại (ưu tiên)

| Mức | Việc | Ghi chú |
|-----|------|---------|
| **P0** | Không còn P0 chặn UX tài khoản sau cleanup hôm nay (CTA + href đã khớp). | Theo dõi prod: duyệt phiếu trên bảng thật. |
| **P1** | Soften/chặn rõ hơn «Đặt lại MK trên chính mình» + hướng dẫn quên MK admin. | Copy đã hướng; có thể disable nút self-reset. |
| **P1** | UI đọc audit tối thiểu (ai tạo/reset TK, khi nào). | Backend đã có mầm. |
| **P2** | Đổi tên folder `tai-khoan-nhan-su` → `tai-khoan` (cosmetic). | Không gấp. |
| **P2** | Dual-control 2 admin live. | **Không làm** theo yêu cầu hiện tại. |
| **P2** | Force-change MK lần đăng nhập sau (enforce cứng). | Metadata có; kiểm tra gate login sau. |

## Đã sửa hôm nay (slice local)

- Copy hub Tài khoản: bỏ «4 mắt / admin thứ hai bắt buộc» trên luồng thường; giữ xác nhận MK admin.
- Dialog MK: ẩn field email quản trị khác trừ khi tự reset hồ sơ mình; copy tiếng Việt rõ hơn.
- Toast sau lưu NS: trỏ «cột Tài khoản trên Nhân sự» (bỏ «Người dùng và quyền»).
- Metadata + denied copy route legacy; toast Guest bỏ nhắc Vercel.
- One-line href docs MDM + auth-pilot SOP; ENTRYPOINTS thêm dòng Tài khoản.
- Phụ lục trạng thái trên `_agent-admin-auth-review-20260907.md`.

## Rủi ro còn lại

- Admin 1 người tự reset MK hồ sơ mình vẫn được nếu nhập email «quản trị khác» (chỉ ghi nhận, **không** xác thực email đó).
- Dual-write soft: nếu probe bảng lỗi, hàng đợi có thể lệch soft vs bảng — cần smoke trên prod.
- Không chạy migrate/remote / commit trong slice này.
