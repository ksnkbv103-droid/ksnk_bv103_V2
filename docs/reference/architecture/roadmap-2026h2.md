# LỘ TRÌNH PHÁT TRIỂN & TIÊU CHÍ HOÀN THÀNH PILOT (2026H2)
## HỆ THỐNG KIỂM SOÁT NHIỄM KHUẨN (KSNK) — BỆNH VIỆN 103

> **Phiên bản:** 1.0 (30/05/2026)  
> **Trạng thái:** Hoạt động (SSOT Kế hoạch triển khai & Kiểm thử)  
> **Mục tiêu:** Quy hoạch 6 giai đoạn phát triển lâm sàng khoa học, thiết lập bộ tiêu chí hoàn thành Pilot (DoD) nghiêm ngặt cho từng phân hệ.

---

## 1. LỘ TRÌNH PHÁT TRIỂN 6 GIAI ĐOẠN (PHASED ROADMAP)

```
[Phase 0: Ổn định nền] ──> [Phase 1: Dọn dẹp & RLS] ──> [Phase 2: Trọng tâm CSSD]
      (1–2 tuần)                 (2–4 tuần)                 (4–6 tuần)

[Phase 3: Chi tiết NKBV] ──> [Phase 4: UX & Observ]  ──> [Phase 5: HIS/LIS FHIR]
      (6–10 tuần)                (Song song)                 (Dài hạn)
```

---

## GIAI ĐOẠN 0 (PHASE 0): ỔN ĐỊNH NỀN TẢNG (Thời gian: 1–2 tuần)

### 1. Mục tiêu kỹ thuật
*   Thiết lập bộ dữ liệu Seed đầy đủ cho môi trường Local để lập trình viên sẵn sàng làm việc sau reset DB.
*   Biên soạn cẩm nang khôi phục và đồng bộ database (`remote-squash-runbook`) phục vụ staging.
*   Giải quyết và commit triệt để các vertical slices đang còn dở dang (unstaged).
*   Đồng bộ hóa cấu trúc schema offline (IndexedDB) với PostgreSQL prefix mới.

### 2. Pilot DoD (Criteria)
*   [ ] Lệnh `supabase db reset --local` chạy thành công trong vòng $< 40$ giây.
*   [ ] Seed tự động nạp thành công 3 phần: Vai trò lõi (`00-rbac.sql`), Nhân sự kiểm thử (`01-pilot-nhan-su.sql`), và dữ liệu giao dịch mẫu (`02-mock-clinical-operations.sql`).
*   [ ] Tài liệu đặc tả y tế `domain-specification.md` khớp 100% tên bảng prefix mới.
*   [ ] Lệnh `npm run verify` vượt qua tất cả các cổng kiểm duyệt (eslint, tests, CSSD architecture).

---

## GIAI ĐOẠN 1 (PHASE 1): DỌN DẸP COMPAT & KHÓA AN NINH (Thời gian: 2–4 tuần)

### 1. Mục tiêu kỹ thuật
*   Hợp nhất toàn bộ câu lệnh truy vấn trong app từ các view alias cũ (`v_fact_*`, `v_dm_*`) sang các view phân vùng prefix chuẩn (`v_gstt_*`, `v_cssd_*`).
*   DROP vĩnh viễn 24 view bí danh cũ để làm sạch sơ đồ DB.
*   Thắt chặt RLS cho phân hệ tiệt khuẩn CSSD từ mức `authenticated` lên phân vai chi tiết.
*   Loại bỏ các RPC legacy cũ không còn tham chiếu khỏi baseline.

### 2. Pilot DoD (Criteria)
*   [ ] Không còn bất kỳ từ khóa `v_fact_` hoặc `v_dm_` nào xuất hiện trong source code (Kiểm tra bằng lệnh grep).
*   [ ] Chạy thành công lệnh biên dịch TypeScript và `npm run verify:engineering` mà không gặp bất kỳ lỗi Type lâm sàng nào.
*   [ ] Tài khoản không có vai trò `CSSD_STAFF` hoặc `ADMIN` khi truy cập trực tiếp vào API bảng `cssd_fact_lo_tiet_khuan` bằng supabase-js ở client sẽ bị chặn đứng (kiểm tra RLS).

---

## GIAI ĐOẠN 2 (PHASE 2): TRỌNG TÂM VẬN HÀNH CSSD (Thời gian: 4–6 tuần)

### 1. Mục tiêu kỹ thuật
*   Xây dựng bảng kiểm kỹ thuật số (Digital BOM) tại Trạm 3 Đóng gói dụng cụ.
*   Triển khai Ledger Gate cứng (Chặn phát trả dụng cụ nếu không có lịch sử nhập kho sạch).
*   Phát triển facade phân quyền liên kết giữa kho tiệt khuẩn CSSD và Danh mục MDM.

### 2. Pilot DoD (Criteria)
*   [ ] Nhân viên y tế quét mã QR bộ dụng cụ bẩn tại Trạm 3, màn hình hiển thị chính xác danh sách các dụng cụ chi tiết (kéo, panh, kim) thuộc bộ đó lấy từ database.
*   [ ] **Ledger check block:** Tạo một bộ dụng cụ ảo không có bản ghi ledger nhập kho, quét mã QR tại Trạm 6 (Phát trả) $\to$ Hệ thống báo lỗi từ chối giao và yêu cầu nhập kho trước.
*   [ ] Tốc độ truy vấn view tồn kho thực tế `v_cssd_realtime_inventory` phản hồi $< 150\text{ ms}$ tại quy mô $10.000$ bộ dụng cụ.

---

## GIAI ĐOẠN 3 (PHASE 3): CHI TIẾT NGHIỆP VỤ NKBV/HAI (Thời gian: 6–10 tuần)

### 1. Mục tiêu kỹ thuật
*   Xây dựng hoàn thiện 4 form chẩn đoán lâm sàng động (VAP, BSI, UTI, SSI) theo đúng tiêu chuẩn CDC/NHSN.
*   Hoàn thiện quy trình Adjudication: Khoa lâm sàng khai báo $\to$ Khoa KSNK phê duyệt/loại trừ.
*   Xây dựng cổng tải lên kết quả vi sinh của Khoa Vi sinh (Import Excel vi sinh).

### 2. Pilot DoD (Criteria)
*   [ ] Rules Engine tự động nhận diện chính xác ca cấy máu dương tính lấy mẫu ngày lịch thứ 3 của bệnh nhân nhập viện, tạo một phiếu nghi ngờ NKBV ở trạng thái `CHO_XAC_MINH`.
*   [ ] Giao diện cho phép khoa lâm sàng điền đầy đủ các thông số lâm sàng của form CDC (Ví dụ: có sốt, có đặt catheter trung tâm $\ge 2$ ngày) và chuyển trạng thái thành `CHO_DUYET`.
*   [ ] Khi Import file Excel vi sinh chứa mã trùng lặp, hệ thống nhận diện khóa tự nhiên MD5 và bỏ qua dòng trùng, không sinh ca bệnh thừa.

---

## GIAI ĐOẠN 4 (PHASE 4): TRẢI NGHIỆM UX & ĐO LƯỜNG HIỆU NĂNG (Song song)

### 1. Mục tiêu kỹ thuật
*   Triển khai kiểm soát trôi lệch giao diện (Layout Drift CI) dựa trên bộ primitive y tế.
*   Đo lường, tối ưu hóa Top 10 truy vấn RPC chậm bằng lệnh `EXPLAIN ANALYZE` và đánh chỉ mục Index bổ sung.
*   Xây dựng kịch bản kiểm thử tự động khép kín (End-to-End Smoke Tests) bằng Playwright.

### 2. Pilot DoD (Criteria)
*   [ ] Bộ test Playwright tự động chạy thành công kịch bản: Đăng nhập $\to$ Tạo phiên VST $\to$ Quét mẻ tiệt khuẩn CSSD $\to$ Đóng phiên giám sát mà không gặp lỗi giao diện.
*   [ ] Toàn bộ các trang chức năng đạt chỉ số Layout Shift (CLS) $< 0.1$ trên Chrome DevTools.
*   [ ] Không còn RPC nào của Command Center phản hồi chậm vượt quá $> 500\text{ ms}$ tại môi trường Staging.

---

## GIAI ĐOẠN 5 (PHASE 5): TÍCH HỢP HỆ THỐNG TOÀN VIỆN HIS/LIS (Dài hạn)

### 1. Mục tiêu kỹ thuật
*   Kết nối trực tiếp API đồng bộ ca cấy vi sinh thời gian thực từ phần mềm LIS bệnh viện theo chuẩn HL7/FHIR.
*   Tích hợp sâu vòng đời dụng cụ mổ CSSD vào bệnh án điện tử (EMR) của phòng mổ để truy vết khi xảy ra nhiễm khuẩn vết mổ (SSI).

### 2. Pilot DoD (Criteria)
*   [ ] Khi bác sĩ vi sinh nhấn "Hoàn thành" trên hệ thống xét nghiệm LIS, dữ liệu ca cấy dương tính được đẩy qua webhook truyền thẳng vào bảng `nkbv_fact_vi_sinh_records` của Supabase trong vòng $< 2$ giây.
*   [ ] Bệnh án điện tử của một ca mổ ghi nhận chính xác danh sách các mã vạch bộ dụng cụ (`quy_trinh_id`) đã sử dụng cho cuộc mổ đó.
