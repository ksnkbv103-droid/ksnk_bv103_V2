# Intake — P1 Thống nhất chrome analytics VST/GSC

> **Trạng thái:** Đã triển khai (2026-07-17)  
> **Nguồn:** [`dashboard-ux-audit-20260717.md`](dashboard-ux-audit-20260717.md)  
> **Module:** Dashboard shell + Thống kê VST/GSC  
> **Không implement trong chat audit** — mở chat mới `/implement` sau duyệt.

---

## Tóm tắt nghiệp vụ

Trung tâm điều hành và Báo cáo tổng hợp dùng khung **`Bv103AnalyticsPageFrame`** (tiêu đề sticky + bộ lọc). Thống kê VST/GSC lại bọc bằng **`KsnkSupervisionPanel`** (chrome form giám sát) dù đã dùng chung `AnalyticsFilterBar`. Người dùng cảm giác hai hệ thống khác nhau khi chuyển từ trang chủ sang thống kê. Cần **cùng một khung nhìn** cho các màn phân tích, không đổi số liệu / công thức.

---

## Intake kỹ thuật

- **Goal:** `/thong-ke/vst` và `/thong-ke/gsc` nhìn cùng họ với `/` và `/bao-cao-tong-hop` (title + filter sticky + spacing).
- **In scope:**
  - `src/modules/giam-sat-vst/views/VSTAnalyticsView.tsx`
  - `src/modules/giam-sat-chung/views/GscAnalyticsView.tsx`
  - Giữ `AnalyticsFilterBar` trong panel strategic; chỉ đổi outer frame
  - Empty / error / loading: bám pattern `Bv103AnalyticsPageSkeleton` nếu đang lệch
- **Out of scope:**
  - Đổi RPC / công thức KPI / CCS
  - Form nhập liệu VST/GSC (vẫn dùng `KsnkSupervisionPanel`)
  - NKBV / CSSD Report (intake riêng hoặc wave sau)
  - Redesign chart nội dung
- **Acceptance:**
  1) Mở `/thong-ke/vst` → có thanh sticky tiêu đề «Thống kê vệ sinh tay» (hoặc copy hiện có) + filter bar giống CC.
  2) Mở `/thong-ke/gsc` (overview + `?bk=` + `?view=bk-toi`) → cùng khung; drill BK không gãy layout.
  3) Form `/giam-sat-vst` và `/giam-sat-chung` **không** đổi chrome (vẫn panel giám sát).
- **Verify:** `npm run verify:quick` · smoke tay 3 route thống kê
- **Risk:**
  1) Double padding nếu lồng frame trong layout app đã có padding.
  2) Tab GSC «BK tôi» / navigator dài — sticky che nội dung trên mobile.
  3) Scope banner khoa mạng lưới bị đẩy lệch vị trí.

---

## Kế hoạch 3–5 bước

1. So sánh structure CC vs `VSTAnalyticsView` → chốt map props title/actions/filterBar → `verify: review diff nhỏ`.
2. Thay outer `KsnkSupervisionPanel` → `Bv103AnalyticsPageFrame` trên VST analytics → `verify: UI + filter hoạt động`.
3. Làm tương tự GSC analytics (giữ tab switcher / drill trong children) → `verify: ?bk= và ?view=bk-toi`.
4. Kiểm tra scope banner + empty/error → `verify: tay`.
5. `npm run verify:quick`.

---

## 3 case kiểm tay

1. Từ `/` bấm deep link Thống kê VST (giữ kỳ lọc) → landing đúng filter, khung giống CC.
2. `/thong-ke/gsc?bk=<một_mã>` → drill BK trong khung mới, không mất navigator.
3. Mở form ghi nhận VST → vẫn chrome cũ `KsnkSupervisionPanel` (không regress).

---

## Cần bạn xác nhận

- [ ] OK triển khai (chỉ chrome thống kê VST/GSC)
- [ ] Copy tiêu đề giữ như hiện tại / hoặc chỉnh: _______________
