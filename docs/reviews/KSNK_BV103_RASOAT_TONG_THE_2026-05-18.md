# Báo cáo rà soát tổng thể — KSNK BV103

> **Phiên bản:** 2026-05-18  
> **Phạm vi:** Luồng nghiệp vụ, kiến trúc phần mềm, database, UI/UX, tương tác, hiệu năng, tính nhất quán logic & luồng thông tin.  
> **Căn cứ:** `AGENTS.md`, `PROGRESS_REPORT.md`, `docs/specs/10-bv103-implementation-mapping.md`, `docs/handover/*`, `docs/specs/working/BV103_LAYOUT_PRIMITIVES.md`, `supabase/migrations/`, `src/modules/`, `.github/workflows/ci.yml`.

---

## 0. Tóm tắt điều hành

| Khía cạnh | Điểm (1–5) | Nhận xét ngắn |
|-----------|------------|----------------|
| Luồng nghiệp vụ | 4 | VST, GSC, QLCV, CSSD đủ chiều sâu pilot; NKBV MVP; nhiều journey spec chưa triển khai. |
| Kiến trúc app | 4 | Bounded context + Server Actions + SSOT quyền/route; CSSD nhiều entry URL cần kỷ luật nav. |
| Database | 3–4 | Nhiều migration/RPC/view; lịch sử dashboard có giai đoạn vá; FK/RLS/view đọc đang siết dần. |
| UI / UX | 3 | Có chuẩn layout/primitive; LEAN cho phép drift giữa các màn chưa chạm. |
| Tương tác | 4 | Form → Action → phản hồi; dashboard bundle + React Query hợp lý, phụ thuộc RPC. |
| Hiệu năng | 3–4 | Index/RPC/bundle đã chủ động; rủi ro = DB pilot chưa apply đủ + đa-RPC một màn. |
| Logic & luồng tin | 3–4 | Domain thuần + test Vitest ở một số module; chuỗi migration analytics cho thấy hiệu chỉnh nhiều vòng. |

**Kết luận:** Repo **đủ nền pilot theo mảnh**; không khuyến nghị “đập làm lại toàn bộ”. Cần **kỷ luật triển khai DB**, **cửa CI gần `verify:full`**, và **tài liệu SSOT** (mapping + migration) luôn mới hơn handover tĩnh.

---

## 1. Luồng nghiệp vụ

### 1.1 Đã có và tương đối trọn

- **VST:** phiên → quan sát (giới hạn 3 đối tượng/phiên), policy giám sát, lịch sử, import/export, RPC dashboard — vòng khép kín nhập → báo cáo.
- **Giám sát chung:** template `dm_bang_kiem` → phiên → tiêu chí → RPC compliance.
- **QLCV:** Track B, timeline, định kỳ + RPC spawn, đánh giá tháng — contract DB mô tả rõ trong `10-bv103-implementation-mapping.md`.
- **CSSD:** trạm, QR, mẻ tiệt khuẩn, ledger, sự cố, bảo trì TB, kho hóa chất — `fact_*` + policy domain (merge gate, incident, state engine).

### 1.2 Còn mỏng / ngoài phạm vi pilot hiện tại

- **NKBV/HAI:** MVP nhập tay; chưa CDC/HIS/LIS (mapping ghi rõ).
- **Journey spec** (laundry, waste, environmental, REST FHIR…): chủ yếu mô tả — chưa module tương ứng.

### 1.3 Khuyến nghị

- Một **mảnh ACTIVE** + Pilot DoD (`PROGRESS_REPORT` §2.2).
- **Sơ đồ state** (1 trang) cho CSSD + QLCV phục vụ vận hành, bổ sung cho code engine.

---

## 2. Cấu trúc thiết kế phần mềm

### 2.1 Điểm mạnh

- `src/modules/<context>/` với `actions/`, `components/`, `hooks/`, `lib/`, `views/`.
- SSOT: `permission-registry`, `verifyPermission`, `cssd-routes.ts`, `proxy.ts` (session + pilot).

### 2.2 Căng / nợ

- Nhiều “mặt tiền” CSSD + `/cssd-erp/*` — đúng nghiệp vụ nhưng dễ trùng ý nghĩa nếu menu không gọn.
- Dashboard tập trung nhiều RPC — điểm nghẽn tích hợp.

### 2.3 Không “đập” — chỉnh dần

- Trùng menu / logic dài trong `page.tsx` → chuyển dần sang `views/` + `lib/`.

---

## 3. Cấu trúc database

### 3.1 Điểm mạnh

- Tầng `mdm_*` / `dm_*` / `fact_*`; mapping tập trung + changelog.
- Governance FK, view đọc, index perf, RLS theo từng migration.

### 3.2 Rủi ro

- Số migration lớn; tên file kiểu `dashboard_*_fix` phản ánh thử–đo–sửa — **lịch sử** khó đọc, **đích** vẫn có thể ổn định.
- **Handover “48 bảng”** là snapshot tài liệu — **SSOT thực tế = migration + DB live** (đã bổ sung cảnh báo trong Phần 2 handover).

### 3.3 Khuyến nghị

- Catalog RPC “đang dùng” (bảng 1 trang: tên hàm, tham số, consumer app).
- SOP apply migration lên từng môi trường pilot (người, ngày, file).

---

## 4. Giao diện & tương tác

- Chuẩn: `BV103_LAYOUT_PRIMITIVES.md`, `bv103-layout-chrome.ts`, token `globals.css`.
- LEAN: drift class giữa màn — cần sprint UI có chủ đích hoặc `layout:drift-check` trước PR lớn.
- Tương tác: Server Actions + cache client (dashboard); QR phụ thuộc thiết bị.

---

## 5. Hiệu năng

- Đã có migration index, bundle action dashboard, `BV103_ANALYTICS_DEFAULT_MONTHS` (xem `AGENTS.md`).
- Đo thực tế: Network + RPC explain trên DB pilot (`package.json` có script liên quan dashboard SQL).

---

## 6. Tính khoa học logic & luồng thông tin

- Tách policy (`supervision-policy`, `cssd-incident-policy`, merge gate, state engine) + Vitest domain — **tốt**.
- Analytics: nên có **định nghĩa KPI** (công thức, filter, edge case) một file spec + test vàng nhẹ trên fixture.

---

## 7. Tổng hợp: đập / cải thiện / bổ sung

| Loại | Nội dung |
|------|----------|
| Loại bỏ dần | RPC/view không còn caller; menu trùng; logic page quá dài. |
| Cải thiện | CI ≈ lint + lint CSSD + test + engineering + build; catalog RPC; đồng bộ số liệu handover vs migration. |
| Bổ sung | Test NKBV (`lib` aggregate); diagram vận hành; golden KPI. |

---

## 8. Khắc phục đã áp dụng trong repo (2026-05-18)

Các thay đổi **đã áp dụng** cùng phiên bản báo cáo này:

1. **CI (`.github/workflows/ci.yml`):** thêm `npm run lint` và `npm run lint:cssd-architecture` trước Vitest — gần `verify:full`, chặn drift ESLint / kiến trúc CSSD trên PR.
2. **`vitest.config.ts`:** include `src/modules/giam-sat-nkbv/**/*.spec.ts`.
3. **`src/modules/giam-sat-nkbv/lib/nkbv-dashboard-aggregate.spec.ts`:** unit test `aggregateNkbvDashboard`.
4. **`docs/handover/KSNK_BV103_HANDOVER_PART2_DATABASE.md`:** cảnh báo SSOT; đổi tiêu đề §7 thành “tài liệu tham chiếu”.
5. **`docs/handover/KSNK_BV103_HANDOVER_PART1_OVERVIEW.md`:** số migration **98**; mục §7 liên kết `docs/reviews/`.
6. **`PROGRESS_REPORT.md`**, **`docs/specs/README.md`**, **`docs/specs/working/LEAN_EXECUTION_BV103.md`:** liên kết / mô tả CI.
7. **Chất lượng code (để `npm run lint` exit 0 trên CI):**
   - `OfflineSyncManager.tsx`: import `cssdCommandAdvanceStation` qua `contexts/processing-lifecycle/entrypoint` (tuân `no-restricted-imports`); `syncData` khai báo `async function` trước `useEffect` (tránh TDZ); xử lý lỗi `unknown` thay `any`.
   - `supabase-compliance-dashboard-rpc.adapter.ts` + `bv103-feature-config.ts`: thêm `isComplianceDashboardMultiV2Enabled()` (không dùng tên `use*` trong hàm không phải Hook); giữ `useComplianceDashboardMultiV2` deprecated alias.
   - `use-me-tiet-khuan-workflow.ts`: dependency `useCallback` dùng `[activeMe]` (khớp React Compiler).
   - `cong-viec-read.actions.ts`, `qlcv-monthly.actions.ts`: `prefer-const`.

---

## 9. Liên kết nhanh

- [`docs/reviews/README.md`](./README.md)  
- [`AGENTS.md`](../../AGENTS.md)  
- [`PROGRESS_REPORT.md`](../../PROGRESS_REPORT.md)  
- [`10-bv103-implementation-mapping.md`](../specs/10-bv103-implementation-mapping.md)
