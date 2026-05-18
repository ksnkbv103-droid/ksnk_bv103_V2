# BV103 — Giai đoạn 0 UX: persona, kịch bản đo & baseline

> **Ngày:** 15/05/2026  
> **Mục đích:** Chuẩn bị đo cải tiến UI/UX (Giai đoạn 1–6). Tài liệu này là **điểm neo** để sau mỗi đợt chỉnh có thể so sánh “trước / sau”.

---

## 1) Persona đã chốt (5)

| ID | Vai trò | Mục tiêu chính khi vào app | Module / màn ưu tiên (theo menu nghiệp vụ) | Tần suất gợi ý |
|----|---------|----------------------------|---------------------------------------------|----------------|
| **P1** | Điều dưỡng / NV lâm sàng — VST | Ghi nhận phiên rửa tay đúng quy trình, in/xem lịch sử nhanh | `Vệ sinh tay (WHO)` → `/giam-sat-vst` | Hàng ngày theo ca |
| **P2** | NV giám sát chất lượng — GSC | Mở checklist, hoàn thành phiên, xem lịch sử | `Giám sát chung` → `/giam-sat-chung` | Theo đợt kiểm tra |
| **P3** | NV NKBV | Ghi nhận / theo dõi theo quy trình khoa | `Giám sát NKBV` → `/giam-sat-nkbv` | Theo quy định khoa |
| **P4** | Trưởng nhóm / điều phối — QLCV | Xem việc theo trạng thái, giao việc, theo dõi đề xuất & định kỳ | `Công việc` → `/quan-ly-cong-viec` | Hàng ngày |
| **P5** | NV CSSD vận hành | Vào quy trình / mẻ hấp / kho, thao tác ít bước nhất có thể | Menu **CSSD — Vô khuẩn** → `/cssd-erp`, `/cssd-erp/batch`, … | Hàng ca |
| **P6** *(tuỳ chọn pilot)* | Quản trị / chủ nhiệm KSNK | Phân quyền, danh mục, tài khoản | `Quản trị hệ thống`, **Danh mục dùng chung** → `/quan-tri-he-thong` | Theo đợt cấu hình |

*Ghi chú:* Menu thực tế **lọc theo quyền** (`Sidebar.tsx`). Khi test, ghi rõ tài khoản thử thuộc persona nào và module nào **ẩn / hiện**.

---

## 2) Kịch bản nhiệm vụ đo (2–3 / persona)

Dùng đồng hồ (điện thoại hoặc screen record). **Tiêu chí thành công** = hoàn tất đúng nghiệp vụ **hoặc** dừng tại chỗ lỗi / không tìm thấy (ghi lại).

### P1 — VST

| # | Nhiệm vụ | Bước vào | Tiêu chí thành công |
|---|----------|----------|---------------------|
| T1 | Tạo / mở phiên VST mới và lưu được | `/giam-sat-vst` | Có thông báo thành công hoặc mục mới xuất hiện trong danh sách |
| T2 | Tìm lại phiên vừa ghi trong lịch sử | Cùng module, vùng lịch sử / bảng | Tìm đúng theo ngày hoặc mã phiên |
| T3 | In hoặc xem bản in (nếu có nút in) | Từ chi tiết phiên | Không lỗi trắng màn / dialog rõ ràng |

### P2 — GSC

| # | Nhiệm vụ | Bước vào | Tiêu chí |
|---|----------|----------|-----------|
| T1 | Bắt đầu phiên giám sát từ template có sẵn | `/giam-sat-chung` | Form hiển thị đủ trường bắt buộc, không “mất” panel |
| T2 | Lưu nháp rồi hoàn tất | Cùng phiên | Trạng thái đổi đúng mong đợi |
| T3 | Mở lịch sử, lọc theo ngày / khoa (nếu có) | Tab / panel lịch sử | Thấy phiên vừa tạo |

### P3 — NKBV

| # | Nhiệm vụ | Bước vào | Tiêu chí |
|---|----------|----------|-----------|
| T1 | Tạo bản ghi / phiên theo form chuẩn | `/giam-sat-nkbv` | Submit không lỗi validation mơ hồ |
| T2 | Tìm lại trong danh sách | Cùng module | Đúng bản ghi |

### P4 — QLCV

| # | Nhiệm vụ | Bước vào | Tiêu chí |
|---|----------|----------|-----------|
| T1 | Tìm một công việc đang mở và xem chi tiết | `/quan-ly-cong-viec` | Mở được chi tiết trong ≤3 thao tác từ lúc vào trang (tìm + click) |
| T2 | Cập nhật trạng thái / báo cáo tiến độ (theo quyền) | Từ chi tiết | Trạng thái đổi, có phản hồi (toast / refresh) |
| T3 | (Nếu có quyền) Tạo việc mới hoặc đề xuất | Form tương ứng | Lưu thành công |

### P5 — CSSD

| # | Nhiệm vụ | Bước vào | Tiêu chí |
|---|----------|----------|-----------|
| T1 | Từ menu vào đúng “Mẻ hấp” | `/cssd-erp` → điều hướng con → `/cssd-erp/batch` | Không cần hỏi đồng nghiệp “vào đâu” |
| T2 | Mở một mẻ / bước quy trình (theo dữ liệu pilot) | `/cssd-erp/batch` | Thấy rõ bước hiện tại; không lạc trong sub-nav |
| T3 | Quay về “Quy trình” hoặc dashboard CSSD | Sub-nav / breadcrumb | Về đúng màn trong ≤2 click |

### P6 — Quản trị (pilot)

| # | Nhiệm vụ | Bước vào | Tiêu chí |
|---|----------|----------|-----------|
| T1 | Vào Phân quyền hoặc Tài khoản–nhân sự | `/quan-tri-he-thong` | Menu quản trị rõ |
| T2 | Mở tab Danh mục dùng chung | `/quan-tri-he-thong?tab=dm_registry` | Tab active đúng, không nhầm với trang khác |

---

## 3) Checklist baseline màn hình (ảnh / video ngắn)

Chụp **cùng độ phân giải** (vd: 1440×900) và **mobile** (375×812) nếu pilot có yêu cầu.

| STT | Màn / route | Ghi chú baseline |
|-----|-------------|------------------|
| B0 | `/login` | Trạng thái chưa đăng nhập |
| B1 | `/` (Dashboard) | Sau đăng nhập, đủ quyền VIEW dashboard |
| B2 | Sidebar cả cây (Nghiệp vụ + Quản trị) | Theo đúng tài khoản test |
| B3 | `/quan-ly-cong-viec` | Toàn trang + tab mặc định |
| B4 | `/cssd-erp` | Có sub-nav |
| B5 | `/cssd-erp/batch` | Một màn con đại diện “vận hành” |

**Cách đặt tên file gợi ý:** `ux-baseline-YYYYMMDD-{route-slug}-{desktop|mobile}.png`

---

## 4) Kết quả thực hiện baseline (phiên 15/05/2026)

- **Môi trường:** `http://localhost:3000` (dev server đang chạy).  
- **Điều kiện:** Phiên trình duyệt **không đăng nhập** (không dùng tài khoản thật trong tài liệu).  
- **Quan sát kỹ thuật (a11y snapshot):**
  - `/login`: tiêu đề trang **KSNK 103 — Bệnh viện Quân y 103**; có heading **KSNK 103**, phụ đề **Đăng nhập hệ thống**; trường **Mã nhân viên hoặc email** (placeholder ví dụ NV001/email), **Mật khẩu**, link **Quên mật khẩu?**, nút **Đăng nhập**; vùng **Notifications**.
  - `/quan-ly-cong-viec`, `/cssd-erp/batch`: **bị chuyển hướng về `/login`** — đúng kỳ vọng khi chưa xác thực.
- **Ghi nhận UX (login):** Trước đây có hai nút «Đăng nhập» (header + form); **đã gỡ nút ở header** — chỉ còn CTA trong form (cập nhật Giai đoạn 1).

---

## 5) Việc cần làm ngay sau Giai đoạn 0 (đội pilot)

1. Đăng nhập bằng **tài khoản pilot** đã cấp quyền đủ module.  
2. Chụp B1–B5 theo bảng mục 3; đính kèm vào thư mục nội bộ (Drive / ticket) hoặc `docs/specs/working/_assets/` nếu team cho phép binary trong repo.  
3. Chạy **ít nhất 1 kịch bản / persona** (T1) và ghi thời gian + “chỗ dừng lại” vào bảng dưới.

### Bảng ghi kết quả vòng 1 (copy ra sheet khi test)

| Persona | Kịch bản | Thời gian (s) | Pass/Fail | Ghi chú (lúng túng, lỗi, từ khó khó) |
|---------|----------|---------------|------------|--------------------------------------|
| P1 | T1 | | | |
| … | … | | | |

---

## 6) Giai đoạn 1–5 đã triển khai (15/05/2026)

1. **Copy & nhãn:** Sidebar — «CSSD — Vô khuẩn», «Danh mục dùng chung»; CSSD sub-nav — «Đang mở:»; metadata `/cssd-erp`; trang đăng nhập bỏ nút trùng ở header (một CTA trong form).
2. **CSSD sub-nav:** Lưới 1 cột trên mobile, 3 cột từ `md`; chữ link `text-sm`; nhóm `text-[11px]`→`md:text-xs`; icon lớn hơn trên `md`.
3. **QLCV:** Khối «Lọc nhanh» + `DashboardStats` mặc định **ẩn**, nút bật/tắt; khi áp dụng lọc từ thẻ thì **tự mở** panel; chip «Đang lọc» luôn hiện khi có lọc; **Định kỳ** chuyển sang tab «Thống kê & báo cáo» + dòng dẫn hướng ở tab Danh sách.
4. **Đồng nhất layout:** Đã chạy `npm run layout:drift-check` — còn gợi ý theo module (LEAN), không đổi hàng loạt trong PR này.
5. **Onboarding:** `Bv103UxHintsBanner` — gợi ý có thể ẩn theo `localStorage` (`bv103_ux_hints_v1`), hiển thị trên `/`, `/quan-ly-cong-viec`, tiền tố `/cssd-erp`.

---

## 7) Liên kết kế hoạch tổng thể

- Kế hoạch UI/UX các giai đoạn 1–6: theo thread “cải thiện ngay giao diện và trải nghiệm” (persona → copy → CSSD sub-nav → QLCV → đồng nhất theo PR → onboarding → đo lại).
