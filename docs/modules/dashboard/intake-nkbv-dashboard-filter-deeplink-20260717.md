# Intake — P1 NKBV Thống kê: filter khoa rõ + deep link + chú thích

> **Trạng thái:** Đã triển khai (2026-07-17)  
> **Nguồn:** [`dashboard-ux-audit-20260717.md`](dashboard-ux-audit-20260717.md)  
> **Module:** NKBV (tab Thống kê) · deep link từ Báo cáo tổng hợp / Command Center nếu có hook sẵn  
> **Không implement trong chat audit** — mở chat mới `/implement` sau duyệt.

---

## Tóm tắt nghiệp vụ

Tab **Thống kê** NKBV đã lọc theo khoảng ngày và (ngầm) theo khoa trên header trang, nhưng trong panel thống kê người dùng **không thấy rõ** đang lọc khoa nào; thiếu deep link từ Báo cáo tổng hợp sang đúng kỳ/khoa. Các chỉ số dịch tễ (SIR, DUR, CLABSI…) dùng jargon quốc tế — cần **chú thích tiếng Việt ngắn** để lãnh đạo/điều dưỡng đọc được. Không đổi công thức CCS; NKBV vẫn là outcome tách process.

---

## Intake kỹ thuật

- **Goal:** Tab Thống kê NKBV lọc rõ ràng (ngày + khoa), mở được từ analytics bằng URL, chỉ số epi có chú thích tiếng Việt.
- **In scope:**
  - `NkbvDashboardPanel.tsx` — hiển thị/điều khiển khoa (hoặc mirror `header.selectedKhoa` + nhãn «Đang lọc khoa…»)
  - `GiamSatNkbvPage.tsx` — query params deep link (`tu`, `den`, `khoa`, `tab=dashboard`) nếu chưa có
  - `ComprehensiveNkbvOutcome.tsx` / link từ BCTH (nếu đã có section NKBV) → deep link giữ kỳ
  - Chú thích ngắn cho thẻ JCI/NHSN (SIR, DUR, device-days…) trên panel
  - Action `getGiamSatNkbvDashboardPayload` đã hỗ trợ `khoa_ghi_nhan_id` / `khoa_ghi_nhan_ids` — tận dụng, không đổi schema
- **Out of scope:**
  - Đổi CCS / gộp NKBV vào CCS
  - Redesign toàn bộ chart NKBV / epidemiology RPC mới
  - Chuẩn hóa chrome `Bv103AnalyticsPageFrame` (intake chrome riêng; có thể làm sau)
- **Acceptance:**
  1) Tab Thống kê: đổi khoa trên UI thống kê (hoặc thấy rõ khoa đang lọc) → số liệu KPI/chart đổi theo khoa.
  2) URL kiểu `/giam-sat-nkbv?tab=dashboard&tu=…&den=…&khoa=…` mở đúng tab + kỳ + khoa.
  3) Từ BCTH (ô/outcome NKBV) có link «Xem thống kê NKBV» giữ kỳ lọc khi làm được với filter hiện có.
  4) Hover/chú thích dưới thẻ epi: ≥1 câu tiếng Việt cho SIR và DUR (và các thẻ đang hiện).
- **Verify:** `npm run verify:engineering` nếu đụng action · spec `nkbv-dashboard-aggregate.spec.ts` nếu đổi aggregate · smoke UI
- **Risk:**
  1) Khoa trên header cases vs panel dashboard lệch nhau nếu có 2 state.
  2) `fn_nkbv_dich_te_hoc_rates` chỉ nhận 1 `p_khoa_id` — multi-khoa epi có thể null/soft-fail (giữ hành vi hiện tại).
  3) Deep link trùng param với tab khác trên cùng page.

---

## Kế hoạch 3–5 bước

1. Map state `dashTu` / `dashDen` / `selectedKhoa` ↔ URL searchParams → `verify: reload giữ filter`.
2. Lộ khoa trên `NkbvDashboardPanel` (select hoặc banner) đồng bộ header → `verify: đổi khoa → reload dashboard`.
3. Thêm deep link từ `ComprehensiveNkbvOutcome` (hoặc chỗ NKBV trên BCTH) → `verify: click giữ kỳ`.
4. Chú thích tiếng Việt thẻ epi → `verify: đọc tay`.
5. Chạy spec aggregate + `verify:engineering` nếu đụng action.

---

## 3 case kiểm tay

1. Chọn 1 khoa + khoảng 12 tháng → KPI chỉ phiếu khoa đó; đổi «Tất cả khoa» → tổng tăng/giảm hợp lý.
2. Copy URL có `tab=dashboard&tu&den&khoa` → mở tab Thống kê đúng bộ lọc.
3. BCTH → link NKBV → landing tab Thống kê cùng khoảng ngày báo cáo.

---

## Cần bạn xác nhận

- [ ] OK triển khai
- [ ] Deep link từ BCTH bắt buộc trong slice này / có thể hoãn nếu chưa có nút sẵn: _______________
- [ ] Chú thích SIR/DUR dùng wording PO (nếu có) / để AI đề xuất tiếng Việt ngắn
