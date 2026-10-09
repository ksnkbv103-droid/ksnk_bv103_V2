# Intake — P0 Chuẩn hóa metric Báo cáo CSSD

> **Trạng thái:** Đã triển khai (2026-07-17)  
> **Nguồn:** [`dashboard-ux-audit-20260717.md`](dashboard-ux-audit-20260717.md)  
> **Module:** CSSD Report (`/cssd-erp/report`) · chạm nhẹ Dashboard metric-dictionary  
> **Không implement trong chat audit** — mở chat mới `/implement` sau duyệt.

---

## Tóm tắt nghiệp vụ

Trên Báo cáo CSSD đang có ô **「Tỷ lệ tuân thủ」** tính bằng `100 − (số sự cố / số quy trình) × 100`. Tên gọi dễ bị nhầm với **CCS / tuân thủ giám sát VST–GSC** của KSNK. Cần đổi **nhãn + chú thích công thức** cho đúng nghiệp vụ CSSD (tỷ lệ mẻ/quy trình không gắn sự cố), **không** gộp vào CCS.

---

## Intake kỹ thuật

- **Goal:** Người dùng nhìn KPI CSSD hiểu đúng đây là chỉ số sự cố/quy trình CSSD, không nhầm CCS.
- **In scope:**
  - `src/modules/cssd-erp/views/CSSDReportPage.tsx` (tính `compliance`)
  - `src/modules/cssd-erp/components/report/ReportDashboard.tsx` (nhãn StatCard + tooltip/chú thích)
  - Ghi 1 dòng vào [`metric-dictionary.md`](metric-dictionary.md) mục CSSD (chỉ số riêng, ngoài CCS)
- **Out of scope:**
  - Đổi công thức CCS / RPC strategic VST–GSC
  - Redesign toàn trang CSSD Report / thêm RPC mới
  - Command Center / Báo cáo tổng hợp
- **Acceptance:**
  1) Mở `/cssd-erp/report` → ô KPI **không** còn chữ «Tỷ lệ tuân thủ» mang nghĩa CCS; nhãn mới rõ (vd. «Tỷ lệ quy trình không sự cố» hoặc tương đương đã duyệt).
  2) Có chú thích ngắn dưới ô hoặc tooltip: công thức = `100 − (sự cố / quy trình) × 100` trong kỳ lọc.
  3) Banner cảnh báo đỏ trạm >5% vẫn hoạt động như cũ; số % KPI khớp công thức mới (cùng số liệu, chỉ đổi diễn giải/nhãn).
- **Verify:** `npm run verify:quick` (UI) · nếu đụng action: `npm run verify:cssd` hoặc `verify:engineering`
- **Risk:**
  1) Báo cáo đã in/slide lãnh đạo còn dùng từ «tuân thủ CSSD» — cần thống nhất từ ngữ với PO.
  2) Đổi key `compliance` trong code có thể làm vỡ import phụ — giữ field nội bộ hoặc rename có kiểm tra.
  3) Không vô tình ghi chỉ số này vào CCS trên BCTH.

---

## Kế hoạch 3–5 bước

1. Chốt nhãn tiếng Việt với PO (1 câu) → `verify: review tay copy`.
2. Đổi nhãn + chú thích trên `ReportDashboard` → `verify: mở UI thấy nhãn mới`.
3. Đổi tên biến/comment trong `CSSDReportPage` cho khớp nghiệp vụ (không đổi công thức số trừ khi PO yêu cầu) → `verify: số % giữ nguyên với cùng data`.
4. Thêm mục CSSD vào `metric-dictionary.md` — tách khỏi CCS → `verify: doc review`.
5. Smoke: filter ngày/trạm + tab sự cố → `verify:quick`.

---

## 3 case kiểm tay

1. Có ≥1 quy trình, 0 sự cố → KPI = 100%; nhãn mới + chú thích hiện.
2. 10 quy trình, 1 sự cố → KPI = 90.0%; không thấy từ «CCS».
3. Trạm có tỷ lệ sự cố >5% → banner đỏ vẫn hiện; KPI tổng vẫn đúng công thức.

---

## Cần bạn xác nhận

- [ ] OK triển khai với nhãn đề xuất: **「Tỷ lệ quy trình không sự cố」**
- [ ] Hoặc sửa nhãn thành: _______________
- [ ] Giữ nguyên công thức số (chỉ đổi nhãn/chú thích) — **mặc định có**
