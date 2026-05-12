# 14-Day Architecture Roadmap & Optimization Plan

- **Ngày:** 2026-05-08
- **Quyết định:** Áp dụng triệt để 4 Luật Vàng để loại bỏ phân mảnh kiến trúc, thực thi trong 14 ngày.

## Vấn đề
- Quá nhiều file action phân mảnh (CSSD, MDM).
- Không đồng nhất về phân quyền (quên gọi `verifyPermission`, lạm dụng `createSafeServerClient`).
- Xử lý quá nhiều trên Client thay vì đẩy xuống Database (Smart DB).

## 4 Luật Vàng (Golden Rules)
1. **One Screen = One Query Contract**: Tránh fetch N+1, aggregation xử lý ở DB (View/RPC).
2. **One Entrypoint Per Module**: Gom tất cả action thành `read.actions.ts` và `write.actions.ts`. Có file `types.ts`.
3. **One Pagination Standard**: 100% list dùng server pagination, pageSize mặc định 20.
4. **One Permission Call**: Gọi `verifyPermissions` một lần duy nhất trong action.

## Lộ trình 14 ngày

### Tuần 1 — Hạ tầng chuẩn + Công việc (ROI cao)
- **Ngày 1-2 (Foundation)**: Chuẩn hóa `verifyPermissions`, RLS bảo mật, Pagination hook dùng chung.
- **Ngày 3-5 (Module Công việc)**: Gom action, đẩy search/sort xuống DB, đơn giản hóa form.

### Tuần 2 — CSSD + Giám sát + Quản trị
- **Ngày 6-9 (CSSD)**: Gom action, chuyển logic nặng xuống View/RPC, chuẩn hóa dashboard kho.
- **Ngày 10-12 (GSC/VST/NKBV)**: Chuẩn hóa Pagination, thay join client bằng View.
- **Ngày 13-14 (Quản trị MDM)**: Hợp nhất gateway, dọn dẹp import paths.

## KPI và Tiêu chí nghiệm thu
- **Performance**: p95 page load < 600ms.
- **Codebase**: Giảm 40% file action, giảm 30% LOC UI.
- **Interaction**: Dưới 3 clicks, không spinner dây chuyền.
- **Cơ chế rủi ro**: Chặn merge nếu vi phạm 4 Luật Vàng. Khảo sát KPI qua từng pha.
