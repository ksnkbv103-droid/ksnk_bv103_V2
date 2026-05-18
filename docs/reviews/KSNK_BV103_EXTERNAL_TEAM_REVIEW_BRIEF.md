# BV103 — Bản tổng hợp cho nhóm dev bên ngoài (đánh giá · rà soát · chỉnh sửa)

> **Mục đích:** Một file **mở đầu** để team mới nắm toàn bộ vấn đề cần xem xét, không thay thế đọc `AGENTS.md` và các spec được liệt kê dưới đây.  
> **Cập nhật:** 2026-05-18 (đồng bộ với CI hiện tại, báo cáo rà soát `KSNK_BV103_RASOAT_TONG_THE_2026-05-18.md`, và trạng thái lint).

---

## 1. Thứ tự đọc bắt buộc (onboarding ≤ 1 ngày)

| Thứ tự | Tài liệu | Vì sao |
|--------|----------|--------|
| 1 | [`AGENTS.md`](../../AGENTS.md) | Chuẩn cao nhất: quyền, DB, perf, cấu trúc module. |
| 2 | [`docs/specs/working/LEAN_EXECUTION_BV103.md`](../specs/working/LEAN_EXECUTION_BV103.md) | Checklist PR, CI, verify. |
| 3 | [`PROGRESS_REPORT.md`](../../PROGRESS_REPORT.md) | Lộ trình theo mảnh, Pilot DoD, điểm nghẽn DB. |
| 4 | [`docs/specs/10-bv103-implementation-mapping.md`](../specs/10-bv103-implementation-mapping.md) | SSOT mapping module ↔ bảng/RPC (bắt buộc khi đụng DB). |
| 5 | [`docs/specs/README.md`](../specs/README.md) | Index toàn bộ spec / working. |
| 6 | [`docs/handover/KSNK_BV103_HANDOVER_PART1_OVERVIEW.md`](../handover/KSNK_BV103_HANDOVER_PART1_OVERVIEW.md) | Stack, cây thư mục, env. |
| 7 | [`docs/handover/KSNK_BV103_HANDOVER_PART2_DATABASE.md`](../handover/KSNK_BV103_HANDOVER_PART2_DATABASE.md) | Mô tả bảng (tham chiếu; SSOT vẫn là migration + DB). |
| 8 | [`docs/handover/KSNK_BV103_HANDOVER_PART3_MODULES.md`](../handover/KSNK_BV103_HANDOVER_PART3_MODULES.md) | Luồng từng module, action chính. |
| 9 | [Báo cáo rà soát tổng thể](./KSNK_BV103_RASOAT_TONG_THE_2026-05-18.md) | Đánh giá đa chiều + mục đã khắc phục 2026-05-18. |

**Rule theo file đang sửa:** `.cursor/rules/00-core-ksnk-rules.mdc` và rule `12–16` theo glob module (nếu dùng Cursor).

---

## 2. Bối cảnh sản phẩm & phạm vi

- **Sản phẩm:** KSNK BV103 — giám sát (VST, GSC, NKBV MVP), CSSD (QR/workflow), QLCV nội bộ, dashboard chỉ huy, quản trị MDM/RBAC.
- **Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, Supabase (Postgres + Auth), Server Actions (không REST nội bộ), Vitest, Playwright (E2E tùy chọn).
- **Đã có trong spec nhưng chưa / rất ít code:** HIS/LIS, Rules CDC NKBV, laundry/waste/environmental độc lập, API FHIR — xem cột “chưa” trong `10-bv103-implementation-mapping.md`.

---

## 3. Cấu trúc mã & ranh giới (vi phạm = review blocker)

| Chủ đề | Quy tắc | File / vị trí gợi ý |
|--------|----------|---------------------|
| Module | Mỗi bounded context dưới `src/modules/<ten>/` với `actions/`, `components/`, `hooks/`, `lib/`, `views/`. | `AGENTS.md` § cấu trúc |
| Quyền | SSOT `permission-registry`; mọi ghi phải qua `verifyPermission` / `verifyPermissions`. | `src/lib/server-permission.ts` |
| CSSD import | **Không** import trực tiếp `@/modules/cssd-erp/actions/*` (v.v.) từ **ngoài** module — dùng `contexts/*/entrypoint`. | `eslint.config.mjs` `no-restricted-imports` |
| DB | `mdm_*` / `dm_*` / `fact_*`; không `dict_*` mới; migration + cập nhật mapping khi đổi schema RPC mà app gọi. | `GOVERNANCE_PIPELINE.md` |
| Pilot route | Cờ `KSNK_PILOT_FOUR_MODULES` + chặn route trong `proxy.ts`. | `src/lib/ksnk-pilot-four-modules-scope.ts` |
| Session | Làm mới cookie / auth qua `src/proxy.ts` (Next 16). | `AGENTS.md` |

---

## 4. Cổng chất lượng — phải hiểu trước khi sửa

### 4.1 CI GitHub (`.github/workflows/ci.yml`, job `verify`)

Thứ tự: `npm ci` → `guard-legacy-table-names` → **`npm run lint`** → **`npm run lint:cssd-architecture`** → `npm run test:cssd` → `npm run test:pilot` → `npm run verify:engineering` → `npm run build`.

- **Chưa chạy trên CI:** `verify:full` trọn gói (CI **không** gồm `verify:cssd` đầy đủ vì đã tách lint CSSD + vitest toàn include list), **`verify:mdm*`**, **`verify:admin`** — team cần tự chạy local khi PR đụng MDM/admin.
- **E2E:** job `e2e` có `continue-on-error: true` — **không chặn merge**; cần secrets + `PLAYWRIGHT_BASE_URL`.

### 4.2 Lệnh nên chạy local trước khi giao PR

```bash
npm ci
npm run lint
npm run lint:cssd-architecture
npm run test:cssd
npm run test:pilot
npm run verify:engineering
npm run build
```

Khi đụng nhiều module / trước release: `npm run verify:full` (xem `package.json`). Khi đụng Server Action / `fact_*`: tối thiểu `verify:engineering` (theo `AGENTS.md`).

### 4.3 Môi trường

- `.env.example` + `npm run env:check` / `npm run env:bootstrap`.
- DB: `npm run mdm:migrate` / `mdm:migrate:local` — **code và DB pilot phải đồng bộ** (`PROGRESS_REPORT` đã ghi nghẽn `db push` / history lệch).

---

## 5. Danh sách vấn đề / việc cần xem xét (theo nhóm công việc)

Nhóm dev có thể **chia workstream** song song; mỗi dòng là một hạng mục review hoặc nợ kỹ thuật.

### A. Nghiệp vụ & tài liệu

- [ ] Đối chiếu **Pilot DoD** (`PROGRESS_REPORT` §2.2) với từng module đang pilot — ghi gap “chưa có 3 kịch bản tay / chưa apply DB”.
- [ ] NKBV: MVP nhập tay — rõ roadmap CDC/HIS hay giữ scope (`10-bv103-implementation-mapping.md`).
- [ ] Dashboard / RPC: lập **catalog RPC** (tên, tham số, consumer TS) — giảm phụ thuộc đọc lần lượt ~98 migration.
- [ ] KPI analytics: một tài liệu **định nghĩa công thức** + test vàng (golden) trên fixture — hiện logic phân tán migration + adapter.

### B. Database & triển khai

- [ ] Xác minh **mọi môi trường** (local/staging/pilot) đã apply đủ migration tương ứng nhánh code.
- [ ] Rà soát migration tên `dashboard_*_fix` / `*_restore_*` — không xóa bừa; đánh dấu RPC **superseded** nếu có.
- [ ] Chạy script precheck pilot khi deploy: `trial:db:precheck` (linked) / bản `:local` (`package.json`).
- [ ] CSSD FK health (nếu có quyền Supabase): `cssd:db:audit` / `:local`.

### C. Kiến trúc & code

- [ ] **CSSD:** nhiều URL + `/cssd-erp/*` — rà soát nav trùng ý nghĩa; SSOT `src/lib/cssd-routes.ts`.
- [ ] **Dashboard:** bundle action + React Query — kiểm tra N+1 POST từ client; đo waterfall RPC.
- [ ] **Server Actions:** đếm gate `verifyPermission` trên file mới (`engineering:baseline` có thống kê).
- [ ] **Admin client:** audit theo [`SUPABASE_ADMIN_CLIENT_AUDIT_BV103.md`](../specs/working/SUPABASE_ADMIN_CLIENT_AUDIT_BV103.md).

### D. UI / UX

- [ ] Tuân thủ [`BV103_LAYOUT_PRIMITIVES.md`](../specs/working/BV103_LAYOUT_PRIMITIVES.md) — tránh card lồng card.
- [ ] `npm run layout:drift-check` trước PR UI lớn.
- [ ] Mobile / chart nặng: cân nhắc `next/dynamic` (`AGENTS.md`).

### E. Test & E2E

- [ ] Vitest: pattern trong `vitest.config.ts` — bổ sung spec cho module **chưa** có test thuần khi mở rộng logic.
- [ ] NKBV: đã có `nkbv-dashboard-aggregate.spec.ts` — mở rộng khi thêm `lib/` thuần khác.
- [ ] E2E: bật job chặn merge hay không — quyết định sản phẩm; hiện `continue-on-error: true`.

### F. Bảo mật & vận hành

- [ ] RLS / quyền đọc `fact_*` sau mỗi migration liên quan.
- [ ] Không commit secret; `env:check` trong pipeline nội bộ nếu có.
- [ ] Log lỗi runtime: một template báo cáo bug (log + URL + bước tái hiện) theo `AGENTS.md`.

---

## 6. Cảnh báo ESLint hiện tại (0 error, 13 warning)

CI **pass** vì chỉ có **warning**. Team có thể dọn dần (ưu tiên file dễ sửa):

| File | Nội dung (tóm tắt) |
|------|-------------------|
| `src/components/shared/GiamSatHeaderFields.tsx` | Import/constants không dùng. |
| `src/components/shared/Sidebar.tsx` | Icon Lucide import không dùng. |
| `src/modules/cssd-erp/components/station/SplitAndPrintSubQrButton.tsx` | `Printer` không dùng. |
| `src/modules/cssd-erp/views/CSSDCatalogPage.tsx` | Import tab/chrome không dùng. |
| `src/modules/cssd-erp/views/CSSDERPPage.tsx` | `eslint-disable` thừa. |
| `src/modules/giam-sat-vst/hooks/useVSTForm.ts` | Biến `catch (err)` không dùng → `_err`. |
| `src/modules/quan-ly-cong-viec/views/QuanLyCongViecPage.tsx` | Destructure `loading` không dùng → `_loading`. |
| `src/modules/quan-tri-he-thong/danh-muc/actions/thiet-bi.actions.ts` | `listMasterRows` không dùng. |
| `src/proxy.ts` | Tham số `options` không dùng → tiền tố `_`. |

Chạy lại: `npm run lint` để cập nhật danh sách sau chỉnh sửa.

---

## 7. Module `src/modules/` (để phân công review)

| Thư mục | Ghi chú ngắn |
|----------|----------------|
| `auth` | Đăng nhập / shell liên quan. |
| `dashboard` | Command Center, RPC adapters, React Query. |
| `giam-sat-vst` | WHO 5 moments, policy, RPC dashboard. |
| `giam-sat-chung` | Checklist động, compliance RPC. |
| `giam-sat-nkbv` | MVP ca bệnh; test aggregate đã có. |
| `cssd-erp` | Workflow, batch, catalog, kho HC, bảo trì — **lint kiến trúc riêng**. |
| `cssd-su-co` | Sự cố, policy domino. |
| `quan-ly-cong-viec` | Track B, định kỳ, KPI tháng. |
| `quan-tri-he-thong` | MDM, RBAC, bảng kiểm, nhân sự. |

App Router: `src/app/*` — page mỏng, logic nặng trong `modules/`.

---

## 8. Rủi ro đã biết (không phải bug cụ thể)

1. **Lệch DB ↔ code** nếu không `db push` / migration history remote lệch (`PROGRESS_REPORT` §3).
2. **Độ phức tạp RPC dashboard** — thay đổi một RPC có thể ảnh hưởng nhiều widget; cần regression có dữ liệu.
3. **Handover Part 2** — mô tả bảng là snapshot; luôn đối chiếu migration + mapping.
4. **`useComplianceDashboardMultiV2`** — đánh dấu **deprecated**; dùng `isComplianceDashboardMultiV2Enabled()` cho code mới (tránh nhầm React Hook rules).

---

## 9. Gợi ý chia nhóm review (4 nhóm song song)

1. **DB + migration + mapping** — 1–2 người có quyền đọc Supabase.  
2. **CSSD + eslint `lint:cssd-architecture`** — 1 người quen workflow/QR.  
3. **Giám sát + dashboard adapters + RPC** — 1 người quen analytics SQL.  
4. **QLCV + quản trị + RBAC** — 1 người quen form MDM.

Sau 1 vòng: họp 1 giờ **chốt backlog** theo bảng mục §5 + issue tracker nội bộ.

---

## 10. Liên kết nhanh (bookmark)

- [Index `docs/reviews/`](./README.md)  
- [Rà soát tổng thể 2026-05-18](./KSNK_BV103_RASOAT_TONG_THE_2026-05-18.md)  
- [`GOVERNANCE_PIPELINE.md`](../specs/GOVERNANCE_PIPELINE.md)  
- [`READ_MINIMUM_BY_CHANGE.md`](../specs/READ_MINIMUM_BY_CHANGE.md)  
- [`DEPLOY_FOUR_MODULES_BV103.md`](../specs/working/DEPLOY_FOUR_MODULES_BV103.md)  

**File này:** `docs/reviews/KSNK_BV103_EXTERNAL_TEAM_REVIEW_BRIEF.md` — nên gửi kèm link repo + nhánh mặc định + môi trường Supabase (không gửi secret trong chat công khai).
