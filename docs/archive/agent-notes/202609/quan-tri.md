# Ghi chú AI — Quản trị và lookup

Gộp các ghi chú phiên. Không dùng khi sửa hệ thống.

## _agent-admin-auth-review-20260907

> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`modules/mdm/README.md`](../../../modules/mdm/README.md). Tra cứu lịch sử được.

# Quản trị hệ thống + Auth mật khẩu — audit 2026-09-07

> Máy: Mac BV103 (`machineId` 6bad1c57-…) · Path: `/Users/drnghia/Desktop/ksnk_bv103`  
> Read-mostly · **không** commit/push · Không sửa runtime (không crash P0 thấy)

---

## A. Bản đồ module quản trị (routes, permissions, actors)

### A1. Shell & hub

| Cửa | Route | Entry UI / module | Gate |
|-----|-------|-------------------|------|
| Layout QT | `src/app/quan-tri-he-thong/layout.tsx` | `canAccessQuanTriHub()` | ADMIN **hoặc** VIEW `DANH_MUC` \| `PHAN_QUYEN` \| `NHAN_SU` |
| Hub trang chủ | `/quan-tri-he-thong` → `page.tsx` → `QuanTriDanhMucPage` | Tabs: Danh mục / Phân quyền / IT | Client: `canSeeQuanTriSection` + `usePermission` |
| Deep-link PQ | `/quan-tri-he-thong/phan-quyen` | redirect `?tab=phan_quyen` | `canAccessPhanQuyenRoute` |
| Nhân sự | `/quan-tri-he-thong/nhan-su` | `QuanLyNhanSuPage` → `NhanSuTable` | VIEW `NHAN_SU` (`useModulePermission`) |
| TK nhân sự | `/quan-tri-he-thong/tai-khoan-nhan-su` | **redirect → `/nhan-su`** sau `canAccessTaiKhoanNhanSuRoute` | ADMIN hoặc VIEW+EDIT `PHAN_QUYEN` |
| Bảng kiểm | `/quan-tri-he-thong/bang-kiem` | `BangKiemView` | Layout hub + client module |
| DM dụng cụ | `/quan-tri-he-thong/danh-muc/dung-cu` (+ redirects loai/bo/chi-tiet) | `QuanLyDungCuPage` | `DmMasterPageGuard` / CSSD keys |
| DM hóa chất / TB / khoa | `…/hoa-chat`, `…/thiet-bi`, `…/khoa-phong` | Master pages tương ứng | theo `moduleKey` |
| DM chuyên biệt | `…/danh-muc/chuyen-biet/[loai]` | redirect dedicated nếu có | registry |
| Cá nhân | `/tai-khoan`, `/tai-khoan/doi-mat-khau` | Profile + đổi MK | đã đăng nhập |
| Auth | `/login`, `/login/forgot-password`, `/login/reset-password` | `(auth)/login/**` | public (proxy đẩy user có session) |

SSOT path: `src/lib/master-data/quan-tri-paths.ts` · Hub jobs: `quan-tri-hub-jobs.ts` · Entry module: `src/modules/quan-tri-he-thong/ENTRYPOINTS.md`.

### A2. Actors (vai trò vận hành)

| Actor | Cách nhận diện | Làm được gì trong QT/Auth |
|-------|----------------|---------------------------|
| Trusted email | `isTrustedAdminEmail` ← `ADMIN_EMAILS` | Bypass gate app-layer (break-glass) |
| Role `ADMIN` | `sys_user_roles` / `v_sys_user_permissions` | Full hub + RBAC + provision/reset |
| Người sửa ma trận | `PHAN_QUYEN` + **edit** (`ensureRbacAdmin`) | Provision TK, gán role KSNK, admin reset MK (API) |
| Người xem PQ | `PHAN_QUYEN` view | Ma trận (read), job card «Người dùng» |
| Nhân sự MDM | `NHAN_SU` view/edit/… | Hồ sơ NV; **không** tự provision trừ khi có edit PQ / admin |
| Danh mục | `DANH_MUC` / module CSSD… | Master data; tab IT/MDM khi đủ quyền |
| End-user | session Auth + hồ sơ linked | Login, quên MK (email), đổi MK, liên kết mã NV |

Vai trò gán staff (không gán ADMIN qua UI staff): `HOI_DONG_KSNK` · `NHAN_VIEN_KSNK` · `MANG_LUOI_KSNK` · `KHACH_THONG_KE_GSTT` — `rbac.types.ts`.

### A3. Nhóm chức năng trong `src/modules/quan-tri-he-thong/**`

- **nhan-su/** — CRUD hồ sơ, Tạo TK (prompt), form «Tạo đăng nhập ngay»
- **tai-khoan-nhan-su/** — Actions Auth/RBAC + UI table/reset (**route orphan**, xem B/D)
- **phan-quyen/** — Ma trận RBAC, pack catalog, sync registry, IT danger
- **danh-muc/** — Hub UI, smart import, dụng cụ/HC/TB/khoa, MDM suggestion
- **bang-kiem/** — Master bảng kiểm + tiêu chí
- **views/MdmGovernanceView** + **SystemHealthPanel** — tab IT
- **actions/mdm-gateway** · **verify-permission** · form/table chrome

Nav sidebar: `NAV_GATE_QUAN_TRI` = OR `DANH_MUC|PHAN_QUYEN|NHAN_SU` (`ksnk-nav-gates.ts`).

---

## B. Hiện trạng quên / đổi / tạo mật khẩu

### B1. Quên mật khẩu (self-service — **không** phê duyệt admin)

| Mục | Chi tiết |
|-----|----------|
| UI | `src/app/(auth)/login/forgot-password/page.tsx` · link từ `login/page.tsx` |
| Action | `requestPasswordResetEmail` — `src/modules/auth/actions/staff-password.actions.ts` |
| Cơ chế | Supabase `auth.resetPasswordForEmail(email, { redirectTo: /login/reset-password })` |
| Đặt lại | `src/app/(auth)/login/reset-password/page.tsx` — `onAuthStateChange` PASSWORD_RECOVERY → `supabase.auth.updateUser({ password })` |
| Ai làm | Bất kỳ ai biết email đăng ký Auth |
| Admin | **Không** thấy yêu cầu · **không** duyệt · **không** audit app |

**Gaps:** Không kiểm `is_active` trước khi gửi mail; không hàng đợi viện; phụ thuộc SMTP/Supabase Redirect URLs; không kênh «xin admin» khi email nội bộ hỏng.

### B2. Đổi mật khẩu (đã đăng nhập)

| Mục | Chi tiết |
|-----|----------|
| UI | `src/app/tai-khoan/doi-mat-khau/page.tsx` |
| CTA | Header (`Header.tsx`), Sidebar, nút trên `/tai-khoan` |
| Action | `changePasswordWithReauth` — re-`signInWithPassword` + `updateUser` |
| Rule | MK mới ≥ 8 ký tự; email read-only từ session |

**OK** self-service. **Gaps:** Không bắt đổi sau provision/admin-set; không xác nhận MK mới 2 lần; không audit.

### B3. Tạo mật khẩu / tài khoản (admin provision)

| Mục | Chi tiết |
|-----|----------|
| API | `provisionStaffAuthAccount` — `tai-khoan-nhan-su.actions.ts` |
| Gate | `ensureRbacAdmin()` (trusted / ADMIN / PHAN_QUYEN edit) |
| Cơ chế | `auth.admin.createUser` + link `mdm_nhan_su.auth_user_id` (+ rollback deleteUser nếu link fail) |
| UI sống | (1) `NhanSuTable` cột «Tài khoản» → **Tạo TK** + `window.prompt` MK · (2) `NhanSuLoginFields` trên `NhanSuForm` khi chưa có Auth · (3) `afterSaveNhanSuLogin` gọi provision + `setStaffKsnkRbacRole` |
| Guest pilot | `setupGuestStatsPilotAccountAction` + `GuestStatsAccountCard` — **chỉ mount trên page orphan** |

**Gaps:** MK tạm qua prompt/ô form (dễ lộ màn hình); không force-change; không phiếu duyệt; Guest card **không** vào được qua route hiện tại.

### B4. Admin đặt lại MK (không email)

| Mục | Chi tiết |
|-----|----------|
| API | `adminResetStaffPasswordAction` — `auth.admin.updateUserById` + `ensureStaffAuthEmailMatchesProfile` |
| Gate | `ensureRbacAdmin()` |
| UI thiết kế | `TaiKhoanNhanSuPage` + `TaiKhoanNhanSuStaffRow` (🔑 mở ô MK mới) |
| Route thực tế | `src/app/quan-tri-he-thong/tai-khoan-nhan-su/page.tsx` **redirect → `/nhan-su`** |
| Trên `/nhan-su` | Chỉ **Tạo TK** khi `!auth_user_id` — **không** CTA reset cho user đã có TK |

→ **API còn, UI reset admin thực tế bị orphan** sau slice gộp Nhân sự. Hub job «Người dùng và quyền» vẫn `href: /quan-tri-he-thong/tai-khoan-nhan-su` (`quan-tri-hub-jobs.ts`) → qua gate rồi redirect nhan-su (mất surface reset + Guest card). `system-health-brief` cũng còn link cũ.

### B5. Ai làm gì — bảng nhanh

| Việc | End-user | Admin / PHAN_QUYEN edit |
|------|----------|-------------------------|
| Quên MK | Email self-service | Không tham gia |
| Đổi MK (biết MK cũ) | `/tai-khoan/doi-mat-khau` | — |
| Tạo TK + MK đầu | — | Có (Nhân sự / form) — **không** queue duyệt |
| Cấp lại MK | — | API có; **UI gần như mất** trên route sống |
| Phê duyệt khoa học | — | **Chưa có** bảng/queue/`must_change` |

Login: `loginWithStaffIdentifier` — mã NV hoặc email → resolve email Auth → chặn `is_active=false` lúc login. Session: `checkStaffSessionAllowed`. Link hồ sơ: `syncAccountLinkAction` / `manualLinkAccountAction`.

---

## C. Luồng đề xuất phê duyệt khoa học (state machine)

```
[REQUEST]  nguồn: USER_FORGOT | USER_NO_EMAIL | ADMIN_RESET | FIRST_PROVISION | FORCE_ROTATE
           payload: staff_id | email | lý do | mức khẩn
                │
                ▼
         CHO_XAC_MINH  (verify: mã NV, CCCD/nội bộ, email hồ sơ khớp Auth, is_active)
                │
        ┌───────┴───────┐
        ▼               ▼
     TU_CHOI         CHO_DUYET
   (lý do + audit)       │
                         ▼  Admin đủ quyền (khuyến nghị 4 mắt với ADMIN reset)
                      DA_DUYET
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
   TEMP_PASSWORD    MAGIC_LINK_1x   (giữ self-service email nếu policy cho phép)
   (TTL, 1 lần hiện)                │
          └──────────────┬──────────────┘
                         ▼
              MUST_CHANGE = true  +  ghi audit (actor, target, action, ts, ticket_id)
                         ▼
              USER_LOGIN → bắt đổi MK → HOAN_THANH
```

**Nguyên tắc vận hành viện:**

1. **Quên MK** mặc định giữ email Supabase *nếu* email BV ổn; thêm CTA «Gửi yêu cầu quản trị» khi fail / policy.
2. **Admin reset** luôn tạo phiếu — **cấm** set MK im lặng trên prompt hàng loạt.
3. **Tạo TK** = provision + temp MK + `must_change` + (tuỳ chọn) gán role cùng phiếu.
4. **Audit** tối thiểu: bảng `sys_auth_password_events` hoặc reuse audit hiện có — không chỉ toast.

---

## D. IA/UX quản trị — chỗ rối / chồng màn / thiếu CTA

1. **Hai bề mặt TK lệch nhau:** `/nhan-su` = hồ sơ + Tạo TK; page `TaiKhoanNhanSu*` = reset/role/guest nhưng **route redirect** → mất nút 🔑 và Guest card.
2. **Hub job «Người dùng và quyền»** trỏ `tai-khoan-nhan-su` trong khi catalog system row đã trỏ `/nhan-su` — href không thống nhất.
3. **Hub = «trung tâm danh mục»** hơn «điều hành hệ thống»: thiếu hàng đợi phiếu MK, audit Auth, khóa TK — tab IT có health/MDM nhưng không Auth ops.
4. **Chồng khái niệm:** «Tài khoản» cá nhân (`/tai-khoan`) vs «Tài khoản nhân sự» QT vs «Phân quyền» tab — user dễ nhầm chỗ đổi MK vs chỗ admin cấp MK.
5. **Thiếu CTA trên hàng đã có TK:** chỉ badge «Đã có TK» + vai trò text — không Đặt lại MK / Khóa / Đồng bộ email.
6. **Prompt MK** (`window.prompt`) lệch chrome Dialog (`QuanTriFormDialogShell`) của form khác.
7. **Ma trận RBAC** nặng; deep-link ổn nhưng không có lối tắt «Tài khoản chờ / phiếu MK».
8. **Health brief** còn deep-link orphan → trải nghiệm «mở rồi về Nhân sự».

### Đề xuất 1 cửa Admin «Tài khoản & truy cập»

Một route sống (ví dụ `/quan-tri-he-thong/tai-khoan` hoặc tab hub `?tab=tai_khoan`), gồm:

| Tab | Nội dung |
|-----|----------|
| Nhân sự ↔ Auth | List `v_sys_staff_auth_overview`: trạng thái link, role, `is_active` |
| Phiếu MK | Queue `CHO_DUYET` / lịch sử |
| Phân quyền | Embed hoặc link ma trận |
| Guest / pilot | `GuestStatsAccountCard` |
| Nhật ký | Event provision / reset / reject |

CTA cố định hàng: **Tạo TK** · **Mở phiếu đặt lại MK** · **Khóa/mở** · **Đồng bộ email Auth**. Giữ `/nhan-su` cho hồ sơ MDM; không dual-write UI reset ở hai nơi.

---

## E. Top 10 tinh chỉnh ưu tiên (P0–P2) — slice local nhỏ

| # | P | Slice | File neo |
|---|---|-------|----------|
| 1 | **P0** | Gắn CTA **Đặt lại MK** (gọi `adminResetStaffPasswordAction`) vào cột Tài khoản `NhanSuTable` khi đã có `auth_user_id` + `canProvisionTk` — hoặc bỏ redirect, mount lại `TaiKhoanNhanSuPage` | `NhanSuTable.tsx` · `tai-khoan-nhan-su/page.tsx` |
| 2 | **P0** | Thống nhất href job/health → `/quan-tri-he-thong/nhan-su` **hoặc** route TK sống (một SSOT) | `quan-tri-hub-jobs.ts` · `system-health-brief.actions.ts` |
| 3 | **P0** | Audit tối thiểu khi provision / adminReset (actor, staff_id, action, ts) — kể cả log bảng đơn giản | `tai-khoan-nhan-su.actions.ts` |
| 4 | **P1** | Cờ `must_change_password` (metadata Auth hoặc cột staff) + gate login bắt đổi trước vào app | `staff-login` / `staff-session` / doi-mat-khau |
| 5 | **P1** | Thay `window.prompt` bằng Dialog chrome QT (1 lần hiện + copy) | `NhanSuTable.tsx` |
| 6 | **P1** | Bảng/UI phiếu `password_requests` + trạng thái C→D; quên MK thêm «xin admin» | module auth + hub card |
| 7 | **P1** | Mount lại `GuestStatsAccountCard` trên cửa TK sống | views nhan-su hoặc tai-khoan |
| 8 | **P2** | Hub card «Tài khoản & truy cập» (không chỉ danh mục) | `QuanTriDanhMucPage` / hub jobs |
| 9 | **P2** | Confirm MK mới 2 lần trên đổi/reset; message hết hạn link recovery rõ hơn | doi-mat-khau · reset-password |
| 10 | **P2** | Chuẩn hóa empty/loading + copy quyền trên RBAC / Nhân sự / AccessDenied | layout + views |

**Không làm trong audit này:** commit/push · migration lớn · đổi policy Supabase Dashboard (Confirm email) trừ khi ops yêu cầu.

---

## Files then chốt (đường dẫn cụ thể)

**Auth**

- `src/modules/auth/actions/staff-password.actions.ts`
- `src/modules/auth/actions/staff-login.actions.ts`
- `src/modules/auth/actions/staff-session.actions.ts`
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/login/forgot-password/page.tsx`
- `src/app/(auth)/login/reset-password/page.tsx`
- `src/app/tai-khoan/doi-mat-khau/page.tsx`
- `src/lib/auth/quan-tri-access.ts` · `staff-auth-email.ts` · `trusted-admin-email.ts`

**Admin TK / RBAC**

- `src/modules/quan-tri-he-thong/tai-khoan-nhan-su/actions/tai-khoan-nhan-su.actions.ts` (`provision*`, `adminReset*`, guest)
- `src/modules/quan-tri-he-thong/tai-khoan-nhan-su/actions/account-link-governance.actions.ts`
- `src/modules/quan-tri-he-thong/tai-khoan-nhan-su/views/TaiKhoanNhanSuPage.tsx` (**orphan UI**)
- `src/modules/quan-tri-he-thong/tai-khoan-nhan-su/components/TaiKhoanNhanSuStaffRow.tsx`
- `src/modules/quan-tri-he-thong/nhan-su/components/NhanSuTable.tsx` · `NhanSuForm.tsx` · `NhanSuLoginFields.tsx`
- `src/modules/quan-tri-he-thong/nhan-su/lib/nhan-su-after-save-login.ts`
- `src/modules/quan-tri-he-thong/phan-quyen/actions/rbac-auth.helpers.ts` · `rbac.types.ts`

**Hub**

- `src/app/quan-tri-he-thong/page.tsx` · `layout.tsx`
- `src/modules/quan-tri-he-thong/danh-muc/views/QuanTriDanhMucPage.tsx`
- `src/lib/master-data/quan-tri-hub-jobs.ts` · `quan-tri-paths.ts` · `danh-muc-hub-catalog.ts`

---

*Kết luận một dòng:* Hệ thống đã có đủ **self-service quên/đổi** và **API admin tạo/reset MK**, nhưng **thiếu phê duyệt khoa học + audit + force-change**, và **UI admin reset đang orphan** sau khi gộp vào Nhân sự — ưu tiên P0 là trả CTA reset về một cửa sống và thống nhất href hub.

---

## Cập nhật 2026-09-07 (mục 2–3)

- **Đã apply remote** bảng `public.sys_account_access_request` trên Supabase `ksnk-bv103-prod` (migration local: `supabase/migrations/20260907120000_sys_account_access_request.sql`).
- **Đã xóa UI orphan** `TaiKhoanNhanSuPage` + `TaiKhoanNhanSuStaffRow`. Route `/quan-tri-he-thong/tai-khoan-nhan-su` vẫn redirect → `/quan-tri-he-thong/tai-khoan`.
- **Không làm** cơ chế 2 admin live; bảo mật 1 admin sẽ làm sau.
- App vẫn dual-write soft `extra_data` + bảng phiếu khi probe thấy bảng.

---

## Phụ lục trạng thái cleanup (2026-09-07, lần 2)

### Đã xong
- Hub job + catalog + app-shell: `/quan-tri-he-thong/tai-khoan` (Tài khoản & truy cập).
- Legacy `/quan-tri-he-thong/tai-khoan-nhan-su` → redirect hub (giữ gate quyền).
- UI orphan `TaiKhoanNhanSuPage` / `TaiKhoanNhanSuStaffRow` đã xóa; CTA Tạo TK / Đặt lại MK / duyệt phiếu sống trên `NhanSuTable`.
- GuestStatsAccountCard gắn hub `/tai-khoan`.
- System-health «chưa có TK» → `/nhan-su` (đúng chỗ hành động).
- Copy hub / dialog: bỏ gợi ý «4 mắt / bắt buộc admin thứ hai» trên luồng thường; giữ re-auth MK admin; field email quản trị khác chỉ hiện khi tự reset hồ sơ mình.
- Href docs ngắn: `docs/modules/mdm/README.md`, `docs/reference/guides/auth-pilot-link-sop.md`.

### Hoãn (không làm trong slice này)
- Dual-control live 2 admin (NOT wanted).
- Soft dual-write phiếu: giữ (bảng `sys_account_access_request` + soft `extra_data`).
- Audit chuyên sâu / force-change MK lần đăng nhập kế (đã có metadata một phần — harden sau).
- Đổi tên thư mục module `tai-khoan-nhan-su/` (actions/lib vẫn dùng path cũ — ổn kỹ thuật, cosmetic).

## _agent-quan-tri-eval-cleanup-20260907

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

## _agent-lookup-ssot-unification-plan-20260907

> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`lookup-vs-enum-guidance.md`](../../../reference/architecture/lookup-vs-enum-guidance.md). Tra cứu lịch sử được.

# Kế hoạch thống nhất SSOT lookup (`sys_lookup_value`) — BV103

> 2026-09-07 · Nghiên cứu read-only trên codebase Mac · **Chỉ tài liệu lập kế hoạch** (không đổi schema trong note này).  
> Bổ sung cho [`_agent-lookup-vs-enum-guidance-20260907.md`](../../../reference/architecture/lookup-vs-enum-guidance.md), [`../../core/implementation-mapping.md`](../../../core/implementation-mapping.md), [`../../core/database-view-catalog.md`](../../../core/database-view-catalog.md).

---

## 1. Hiện trạng SSOT (1 bảng + views)

### 1.1 Bảng vật lý duy nhất cho danh mục phẳng

**TABLE** `public.sys_lookup_value`:

| Cột | Vai trò |
|-----|---------|
| `id` (uuid) | Khóa chính ổn định — **FK fact/master trỏ vào đây** |
| `category_type` (text) | Phân loại (vd. `NGHE_NGHIEP`, `CHUC_VU`) |
| `code` (text) | Mã ổn định trong loại (vd. `NN_HOC_VIEN`) — **không đổi khi chỉ đổi nhãn** |
| `name` (text) | Nhãn hiển thị — **được sửa trên UI** |
| `description`, `is_active`, `metadata` (jsonb) | Mô tả / soft-delete / `thu_tu`, `mau_sac`, … |
| `created_at`, `updated_at` | Audit nhẹ |

Comment DB: *«Bảng danh mục lookup hợp nhất từ 11 bảng danh mục phụ…»* — hiện đã rộng hơn (~14 loại trong app registry + seed).

### 1.2 View façade theo module (không phải TABLE)

Mỗi `{module}_dm_*` lookup là **VIEW** `security_invoker` lọc `category_type` và **alias cột** `code→ma_*`, `name→ten_*`. Ví dụ:

| View (đọc app) | `category_type` |
|----------------|-----------------|
| `mdm_dm_chuc_vu` | `CHUC_VU` |
| `mdm_dm_chuc_danh` | `CHUC_DANH` |
| `mdm_dm_nghe_nghiep` | `NGHE_NGHIEP` |
| `mdm_dm_to_cong_tac` | `TO_CONG_TAC` |
| `mdm_dm_khoi_khoa` | `KHOI_KHOA` |
| `gstt_dm_khu_vuc_giam_sat` | `KHU_VUC_GIAM_SAT` |
| `gstt_dm_hinh_thuc_giam_sat` | `HINH_THUC_GIAM_SAT` |
| `gstt_dm_cach_thuc_giam_sat` | `CACH_THUC_GIAM_SAT` |
| `cssd_dm_loai_may` | `LOAI_MAY_TIET_KHUAN` |
| `cssd_dm_tram` | `TRAM_CSSD` |
| `cssd_dm_loai_su_co` | `LOAI_SU_CO` |
| `qlcv_dm_loai_cong_viec` | `LOAI_CONG_VIEC` |
| `qlcv_dm_trang_thai_cong_viec` | `TRANG_THAI_CONG_VIEC` |
| `nkbv_dm_loai` | `LOAI_NKBV` |
| `nkbv_dm_trang_thai_ca` | `TRANG_THAI_NKBV_CA` |

Không còn chuỗi `dm_*` compat (đã DROP 2026-06-02). App đọc `.from('mdm_dm_nghe_nghiep'|…)` — ghi **không** qua view mà qua `sys_lookup_value`.

### 1.3 App write path — `CONSOLIDATED_MAPS`

File: `src/modules/quan-tri-he-thong/danh-muc/actions/master-crud-core.ts`

- `CONSOLIDATED_MAPS`: map `sourceTable` view → `{ categoryType, maColumn, tenColumn, metadataColumns? }`.
- `upsertMasterRow` / soft-delete / toggle: nếu nằm trong map → ghi `sys_lookup_value`; không thì ghi TABLE vật lý (`PHYSICAL_TABLE_NAMES`).
- Admin generic: `generic-dm.actions.ts` + UI `GenericDmMasterPage` tại `/quan-tri-he-thong/danh-muc/chuyen-biet/[LOAI]`.
- Registry đọc: `domain-registry.ts` (`loaiDanhMuc` → view + cột).
- Hub IA: `danh-muc-hub-catalog.ts` (nhóm `to-chuc` / `giam-sat` / `cssd` / …).
- Khóa hệ thống (chỉ xem): `locked-system-lookups.ts` — hiện `TRANG_THAI_CONG_VIEC`, `TRANG_THAI_NKBV_CA`, `TRAM_CSSD`, `VAI_TRO_HE_THONG_KSNK`.

### 1.4 Governance

- **TABLE** `sys_mdm_registry` (+ `sys_mdm_suggestion`): đăng ký cột `FK_TO_DM` → `sys_lookup_value` + `source_loai_danh_muc`.
- Trigger `fn_mdm_validate_lookup_integrity`: khi ghi fact/master, kiểm tra UUID tồn tại **và** `category_type` khớp loại đăng ký (seed bulk `20260604150000`).
- Ví dụ đã seed: `mdm_nhan_su.nghe_nghiep_id` → `NGHE_NGHIEP`; `gstt_fact_chung_sessions` / `gstt_fact_vst` (`nghe_nghiep_id`, `khu_vuc_id`, `hinh_thuc_id`, `cach_thuc_id`); CSSD/NKBV FKs tương tự.
- **Lưu ý QLCV:** sau `20260607100000` đã **DROP** `loai_cong_viec_id` / `trang_thai_id` — fact dùng **text + CHECK**; view `v_qlcv_cong_viec_full` JOIN lookup **theo `ma`** để lấy `ten`/`mau_sac`. Seed registry cũ cho `loai_cong_viec_id` cần audit/deactivate (pha 0).

### 1.5 Script / tài liệu đo

- `scripts/sql/lookup-catalog-audit.sql`, `lookup-full-audit.sql`, `lookup-wave2-ids.sql`
- `scripts/sql/mdm-governance-*.sql`, `mdm-coverage-gate.mjs`
- Prefix mã: `lookup-code-prefix.ts` (NN, HT, CT, CD, CV, LM, SC, TC, KV, …)

---

## 2. Phân loại A enum / B lookup / C master (bảng quyết định)

Công thức (đã chốt trong guidance 2026-09-07):

```
Đổi giá trị có phá Kanban / quyền / spawn / form field / scoring cứng?
  → Có  → A. Enum + CHECK (hoặc mã gắn code)
  → Không, chỉ đổi tên/thêm mục nhãn?
       → Có thuộc tính/quan hệ/số lượng lớn?
            → Có  → C. Bảng master
            → Không → B. sys_lookup_value
```

| Tầng | Khi nào | Sửa không đụng code? | Ví dụ BV103 |
|------|---------|----------------------|-------------|
| **A. Enum / mã quy trình** | Ít giá trị; mã = nhánh logic | **Không** (đổi = release) — tối đa sửa **nhãn map trong code** | QLCV `loai_cong_viec` / `trang_thai` (TEXT+CHECK); `gstt_dm_bang_kiem.doi_tuong_giam_sat` / `loai_giam_sat` / `cach_tinh_diem` / `phan_loai_chuyen_mon`; Spaulding / phương pháp TK trên `cssd_dm_loai_dung_cu` |
| **B. Lookup phẳng** | Chỉ mã+tên (+metadata nhẹ) | **Có** — CRUD hub | Chức vụ, nghề nghiệp, tổ, khối, khu vực GS, hình thức/cách thức, loại máy, loại sự cố, loại NKBV, … |
| **C. Master TABLE** | Nhiều cột, quan hệ, BOM, JSON tiêu chí | **Có** — form chuyên | Khoa phòng, nhân sự, loại/bộ dụng cụ, thiết bị, hóa chất, bảng kiểm, RBAC roles |

---

## 3. Danh sách: đã trong lookup | ứng viên chuyển thêm | cấm chuyển

### 3.1 Đã trong `sys_lookup_value` (tầng B — giữ)

| `category_type` | View façade | Ghi chú |
|-----------------|-------------|---------|
| `KHOI_KHOA` | `mdm_dm_khoi_khoa` | FK `mdm_dm_khoa_phong.khoi_id` |
| `TO_CONG_TAC` | `mdm_dm_to_cong_tac` | FK nhân sự / QLCV |
| `CHUC_VU` | `mdm_dm_chuc_vu` | FK `mdm_nhan_su` |
| `CHUC_DANH` | `mdm_dm_chuc_danh` | FK `mdm_nhan_su` |
| `NGHE_NGHIEP` | `mdm_dm_nghe_nghiep` | FK GSC/VST/nhân sự — **case đổi nhãn Học viên→Sinh viên** |
| `KHU_VUC_GIAM_SAT` | `gstt_dm_khu_vuc_giam_sat` | FK phiên GS |
| `HINH_THUC_GIAM_SAT` | `gstt_dm_hinh_thuc_giam_sat` | |
| `CACH_THUC_GIAM_SAT` | `gstt_dm_cach_thuc_giam_sat` | |
| `LOAI_MAY_TIET_KHUAN` | `cssd_dm_loai_may` | FK thiết bị / lô TK |
| `TRAM_CSSD` | `cssd_dm_tram` | **Locked** — mã máy workflow |
| `LOAI_SU_CO` | `cssd_dm_loai_su_co` | |
| `LOAI_NKBV` | `nkbv_dm_loai` | |
| `TRANG_THAI_NKBV_CA` | `nkbv_dm_trang_thai_ca` | **Locked** |
| `LOAI_CONG_VIEC` | `qlcv_dm_loai_cong_viec` | Còn dùng **JOIN nhãn theo `ma`**; fact = text CHECK → nên **khóa CRUD** (xem 3.2) |
| `TRANG_THAI_CONG_VIEC` | `qlcv_dm_trang_thai_cong_viec` | Đã **Locked**; fact = text CHECK |

`sys_roles` **không** nằm trong lookup — TABLE RBAC riêng (hub hiển thị như registry nhưng ghi bảng `sys_roles`).

### 3.2 Ứng viên «chuyển thêm» / tinh gọn (không tạo TABLE mới)

| Hạng mục | Đề xuất | Lý do |
|----------|---------|-------|
| `LOAI_CONG_VIEC` hub CRUD | **Khóa / ẩn mutate** (giống trạng thái); giữ view cho JOIN `ten` | Logic app + CHECK fact đã là tầng A; CRUD thêm mã mới sẽ lệch Kanban/spawn |
| Nhãn hiển thị QLCV | Cho phép **chỉ sửa `name`** (không thêm/xóa/đổi `code`) nếu vẫn muốn map nhãn từ DB | Tùy chọn pha 2 — hoặc map nhãn cứng trong UI |
| `doi_tuong_giam_sat` / metadata bảng kiểm (CHECK) | **Không** đưa vào lookup | Quyết định form fields (NHAN_VIEN bắt nghề…); đổi mã = đổi code |
| Orphan `category_type` còn trong DB (vd. lịch sử `KHOA_KSNK_CONFIG`, đã xóa `NGUYEN_NHAN_LOI` / `HANH_DONG_CAN_THIEP`) | Audit pha 0 → archive/soft-off; **không** mở hub | Tránh «danh mục ma» |
| `ksnk_dm_muc_tieu_kpi` | **Giữ TABLE** (metric_key × khoa) | Không phải mã+tên phẳng |
| Không còn TABLE phẳng nào «nhân đôi» cần consolidate | — | Slice 8 / rename 2026-05 đã gom xong; `LOAI_DUNG_CU` cố ý **không** gom |

**Kết luận câu hỏi 1:** Hầu như **không còn** danh mục phẳng vật lý cần «chuyển vào» lookup. Việc còn lại là **khóa enum giả-lookup (QLCV)**, audit orphan category, và **không** nhầm master C thành B.

### 3.3 Cấm chuyển vào lookup (tầng C / đặc thù)

| Đối tượng | Lý do cấm |
|-----------|-----------|
| `mdm_dm_khoa_phong` | `khoi_id`, `specs` jsonb, quan hệ rộng |
| `mdm_nhan_su` | Hồ sơ + `auth_user_id` + nhiều FK |
| `cssd_dm_loai_dung_cu` | Spaulding, chịu nhiệt, PP tiệt khuẩn, tồn dự phòng — form dedicated |
| `cssd_dm_bo_dung_cu` (+ `_chi_tiet`) | BOM / unique bộ×loại |
| `cssd_dm_thiet_bi` | Serial, bảo trì, `loai_may_id`, trạng thái máy |
| `cssd_dm_hoa_chat` | Ngưỡng tồn, lô kho |
| `gstt_dm_bang_kiem` | `tieu_chi_jsonb`, `ap_dung_jsonb`, CHECK metadata, phiên bản |
| `sys_roles` / permissions | RBAC matrix |
| `ksnk_dm_muc_tieu_kpi` | Mục tiêu KPI theo metric×khoa |
| Fact `*_fact_*` | Không phải danh mục |

---

## 4. Đổi tên / CRUD theo hạng mục — quy trình admin + kỹ thuật

### 4.1 Admin (tầng B — lookup được phép sửa)

1. Vào **Trung tâm quản trị** → nhóm tương ứng → mở `/quan-tri-he-thong/danh-muc/chuyen-biet/{LOAI}` (`GenericDmMasterPage`).
2. **Thêm:** tạo dòng mới → `insert sys_lookup_value` (`category_type`, `code` theo `lookup-code-prefix`, `name`, `is_active`).
3. **Sửa nhãn:** sửa `name` (và metadata nếu có) — **giữ nguyên `id` và `code`**.
4. **Xóa:** soft-delete (`is_active=false`) — không hard-delete nếu còn FK (governance + thực tế vận hành).
5. **Excel:** import/export qua `generic-dm-import.actions` (bị chặn nếu `isLockedSystemLookup`).
6. Quyền: `verifyDanhMucLookupPermission` theo module tách (`DANH_MUC_*` / domain).

### 4.2 Kỹ thuật đổi nhãn an toàn (ví dụ Học viên → Sinh viên)

```
UPDATE sys_lookup_value
SET name = 'Sinh viên', updated_at = now()
WHERE category_type = 'NGHE_NGHIEP' AND code = 'NN_HOC_VIEN';
-- id UUID không đổi → mọi nghe_nghiep_id trên fact/nhân sự vẫn đúng
```

- **Cấm** đổi `code` nếu đã có báo cáo/filter theo mã (trừ migration có map + release).
- **Cấm** tạo dòng mới «Sinh viên» song song rồi để dòng cũ — sẽ tách thống kê.
- Cache: `revalidateMasterDataRowCacheTag` + tag `danh-muc-NGHE_NGHIEP` (900s trên một số loại static).

### 4.3 Tầng A (enum)

- Không CRUD hub (hoặc chỉ xem).
- Đổi nhãn UI: map trong code / i18n; đổi mã: migration CHECK + app types + test.

### 4.4 Tầng C (master)

- Form dedicated (`khoa-phong`, `dung-cu`, `thiet-bi`, `hoa-chat`, `bang-kiem`, `nhan-su`).
- Generic mã–tên **bị chặn** cho `KHOA_PHONG` / `LOAI_DUNG_CU` (`genericDmMustUseDedicatedPageError`).

---

## 5. Liên động (referential consistency)

### 5.1 Nguyên tắc SSOT tham chiếu

| Lớp | Cách lưu | Hiển thị |
|-----|----------|----------|
| Lookup B → fact/master | **`uuid` FK** (`nghe_nghiep_id`, `khu_vuc_id`, …) + trigger MDM category | **Live JOIN** `name` / view `ten_*_hien_thi` |
| QLCV loại/trạng thái | **`code` text + CHECK** trên fact | JOIN lookup **theo `ma`** lấy `ten` (nhãn); logic runtime theo mã |
| Bảng kiểm metadata | **TEXT enum CHECK** trên `gstt_dm_bang_kiem` | Label map app (`BangKiemDoiTuongGiamSat`, …) |
| Phiếu GSC đã chốt | `bang_kiem_id` FK + **`metadata.bang_kiem_snapshot`** | Nội dung tiêu chí / tên mẫu **đóng băng** lúc lưu (BK-1) |

**Cấm** snapshot tên lookup vào fact «cho tiện» (vd. cột text `nghe_nghiep` song song id) trừ khi có lý do audit bất biến đã ghi rõ. Comment lịch sử trên VST nhắc denorm legacy; schema hiện tại SSOT là `*_id`; read view tính `ten_nghe_nghiep_hien_thi` bằng JOIN.

### 5.2 Nghiên cứu thực tế GSC / VST / thống kê

| Nơi | Lưu gì hôm nay | Đổi `name` nghề có chảy không? |
|-----|----------------|--------------------------------|
| `gstt_fact_chung_sessions.nghe_nghiep_id` | UUID FK | **Có** — RPC/dashboard filter theo id; nhãn JOIN live |
| `gstt_fact_vst.nghe_nghiep_id` | UUID FK | **Có** — `ten_nghe_nghiep_hien_thi` trên read view |
| `mdm_nhan_su.nghe_nghiep_id` | UUID FK | **Có** — enrich/gateway JOIN view |
| Analytics RPC (`p_nghe_nghiep_ids`) | Mảng UUID | **Có** — không phụ thuộc chuỗi tên |
| `metadata.bang_kiem_snapshot` | `ten_bang_kiem` + `tieu_chi_jsonb` (nhãn tiêu chí) | **Không đổi** trên phiếu đã chốt — **đúng chủ đích** (không phải nghề) |
| `results_jsonb` | `criterion_id` + value | Tham chiếu id tiêu chí trong snapshot; không lưu tên nghề |
| `doi_tuong_giam_sat` trên mẫu BK | Code CHECK (`NHAN_VIEN`…) | Đổi nhãn UI = sửa map code; **không** liên quan `NN_HOC_VIEN` |

**Case «đối tượng giám sát học viên → sinh viên»:** đây là **`NGHE_NGHIEP.name`** (đối tượng quan sát theo nghề), không phải enum `doi_tuong_giam_sat`. Sửa `name`, giữ `id`/`code` → bảng kiểm mới, form header, thống kê theo nghề **đồng bộ**; phiếu GSC cũ vẫn giữ snapshot **mẫu bảng kiểm** (tiêu chí), còn cột nghề trên phiên vẫn trỏ UUID → nhãn mới khi in/xem nếu UI JOIN live (in nhãn: `giam-sat-chung-print-labels` SELECT `ten_nghe_nghiep` theo id → **live**).

### 5.3 Checklist trước khi đổi nhãn / khóa

- [ ] Xác định tầng A/B/C.
- [ ] Grep fact/view/RPC: FK id vs code vs text name.
- [ ] Đổi chỉ `name` (B) hoặc map label (A); không đổi `id`.
- [ ] Nếu đổi `code`: migration + backfill + cập nhật CHECK/app.
- [ ] Soft-off thay vì xóa nếu còn FK.
- [ ] Revalidate cache master-data.
- [ ] Spot-check: form GSC/VST, export, dashboard filter nghề, in phiếu.
- [ ] Phiếu GSC đã chốt: chấp nhận snapshot mẫu BK bất biến; không «sửa sử» tiêu chí cũ bằng cách rename lookup.

---

## 6. View tổng hợp vs nhiều view mỏng

### 6.1 Đề xuất

1. **Thêm (optional)** `v_sys_lookup_all` = chiếu thẳng `sys_lookup_value` (hoặc alias ổn định cho admin/audit) — filter `category_type` / `is_active` ở query.
2. **Giữ** toàn bộ `{module}_dm_*` lookup hiện có như **alias tương thích** (domain-registry, PostgREST column names, Excel mapping).
3. **Không** bắt buộc app rewrite ngay sang một view duy nhất — registry + CONSOLIDATED_MAPS đã là SSOT ghi.
4. Read path dài (`v_gstt_*`, `v_qlcv_*`): tiếp tục JOIN physical `sys_lookup_value` hoặc view module một tầng (đã flatten 2026-06) — tránh chuỗi view lồng.

### 6.2 Trả lời câu hỏi 3

**Có thể có một view tổng hợp** cho vận hành/admin/audit; **nhiều view mỏng không phải nhiều bảng** — chúng chỉ là façade. Gộp UX ≠ DROP hết façade trong một PR.

---

## 7. UX hub một cửa «Danh mục hệ thống»

### 7.1 Hiện trạng

`danh-muc-hub-catalog.ts` đã có nhóm: Tổ chức & nhân sự · Giám sát & bảng kiểm · Master CSSD · NKBV · Công việc · Hệ thống & quyền · (lookup residual).

Cảm giác «vụn» đến từ nhiều ô **lookup** ngang hàng với **dedicated** masters.

### 7.2 Đề xuất IA (pha 2)

Một cửa **«Danh mục hệ thống»** (lookup B only), chia section:

| Nhóm UI | Loại |
|---------|------|
| Tổ chức | `KHOI_KHOA`, `TO_CONG_TAC`, `CHUC_VU`, `CHUC_DANH`, `NGHE_NGHIEP` |
| Giám sát | `KHU_VUC_GIAM_SAT`, `HINH_THUC_GIAM_SAT`, `CACH_THUC_GIAM_SAT` |
| CSSD (lookup) | `LOAI_MAY_TIET_KHUAN`, `LOAI_SU_CO` (+ `TRAM_CSSD` chỉ xem) |
| NKBV | `LOAI_NKBV` (+ trạng thái ca chỉ xem) |
| Công việc (nhãn hệ thống) | `LOAI_CONG_VIEC` / `TRANG_THAI_CONG_VIEC` — badge «Hệ thống — không sửa mã» |

Masters C **giữ lối riêng** (Khoa phòng, Nhân sự, Bảng kiểm, Dụng cụ, Thiết bị, Hóa chất) — không nhét vào lưới mã–tên.

Tìm kiếm xuyên catalog đã có (`filterDanhMucHubRows`).

Nguyên tắc UX: trực quan (nhóm nghiệp vụ), khoa học (A/B/C badge), cụ thể (số dòng active từ stats), tiện (một generic form + Excel cho mọi B).

---

## 8. Lộ trình pha 0–4

| Pha | Việc | Kết quả |
|-----|------|---------|
| **0 — Đo** | Chạy `lookup-catalog-audit` / `lookup-full-audit`; liệt kê `category_type` thực tế vs CONSOLIDATED_MAPS vs registry; deactivate seed MDM thừa (`qlcv_fact_cong_viec.loai_cong_viec_id`); ghi orphan | Biên bản «đã đủ B / orphan / drift» |
| **1 — Khóa enum QLCV** | Thêm `LOAI_CONG_VIEC` vào `LOCKED_SYSTEM_LOOKUP_LOAI` (hoặc ẩn create/edit); banner «mã máy / CHECK»; không xóa view | Admin không thêm loại CV lệch app |
| **2 — Hub IA** | Section «Danh mục hệ thống» theo nhóm §7; badge Locked / Master / Lookup; deep-link giữ `chuyen-biet/[LOAI]` | UX một cửa, ít vụn |
| **3 — Audit snapshot / FK** | Checklist §5.3 trên GSC/VST/nhân sự/CSSD; xác nhận không còn ghi tên nghề denorm; tài liệu hóa ngoại lệ `bang_kiem_snapshot`; test đổi nhãn `NN_HOC_VIEN` trên staging | Rename label chảy thống kê + form |
| **4 — Optional dọn view** | Thêm `v_sys_lookup_all` nếu cần; **không** DROP façade module trừ khi grep app=0 và có compat window | Schema gọn hơn về mặt nhận thức, không phá consumer |

Mỗi pha: không migration «gom bảng» (đã gom); ưu tiên lock + UX + audit.

---

## 9. Rủi ro & không làm

**Rủi ro**

- CRUD tự do trên `LOAI_CONG_VIEC` / trạng thái → lệch CHECK fact và Kanban.
- Đổi `code` hoặc tạo bản ghi trùng nghĩa → gãy filter/thống kê.
- Nhầm `doi_tuong_giam_sat` (enum A) với nghề (lookup B).
- Ép `LOAI_DUNG_CU` / bảng kiểm vào lookup → mất cột nghiệp vụ.
- DROP view module sớm → vỡ `.from('mdm_dm_*')` / Excel column map.
- Sửa snapshot phiếu cũ khi rename mẫu BK → phá audit phiên đã chốt.

**Không làm**

- Không tạo TABLE nhỏ mới cho 3–5 dòng mã+tên.
- Không consolidate master C vào `sys_lookup_value`.
- Không hard-delete lookup còn FK.
- Không «sửa sử» `bang_kiem_snapshot` hàng loạt khi đổi tên mẫu.
- Không mở lại `NGUYEN_NHAN_LOI` / `HANH_DONG_CAN_THIEP` (đã xóa 2026-06-06) nếu không có product case mới.
- Không dùng note này làm license sửa production — chỉ plan.

---

## 10. Tiêu chí xong

- [ ] Mọi danh mục phẳng vận hành nằm ở tầng đúng A/B/C (bảng §2–§3 đã rà và đồng ý).
- [ ] Admin thêm/sửa/xóa (soft) lookup B theo hạng mục qua hub một cửa; Locked không mutate.
- [ ] Đổi `name` (giữ `id`/`code`) phản ánh trên form, in, export, dashboard filter **không** cần deploy (trừ A).
- [ ] Không còn dual-write / denorm tên lookup trên fact mới; ngoại lệ snapshot BK được ghi rõ và test.
- [ ] `LOAI_CONG_VIEC` không còn CRUD tự do; fact QLCV chỉ text+CHECK.
- [ ] Registry MDM không còn FK trỏ cột đã DROP; orphan `category_type` đã xử lý hoặc gắn nhãn.
- [ ] Tài liệu này + guidance enum được link từ `implementation-mapping` / hub README khi triển khai pha 2+.
- [ ] (Optional pha 4) `v_sys_lookup_all` tồn tại; façade module vẫn alias ổn định.

---

## Phụ lục — File neo nhanh

| Vai trò | Path |
|---------|------|
| Guidance A/B/C | `docs/reference/architecture/_agent-lookup-vs-enum-guidance-20260907.md` |
| SSOT mapping | `docs/core/implementation-mapping.md` |
| View catalog | `docs/core/database-view-catalog.md` |
| CONSOLIDATED_MAPS | `src/modules/quan-tri-he-thong/danh-muc/actions/master-crud-core.ts` |
| Registry | `src/lib/master-data/domain-registry.ts` |
| Locked | `src/lib/master-data/locked-system-lookups.ts` |
| Hub IA | `src/lib/master-data/danh-muc-hub-catalog.ts` |
| Snapshot BK | `src/modules/giam-sat-chung/lib/gsc-bang-kiem-snapshot.ts` |
| MDM trigger seed | `supabase/migrations/20260604150000_mdm_registry_bulk_seed_and_trigger_fix.sql` |
| QLCV text-only | `supabase/migrations/20260607100000_qlcv_text_only_schema_cleanup.sql` |

---

## Phụ lục (2026-09-07): `dao_tao_cau_hinh` và `sys_roles` có gộp `sys_lookup_value`?

### Kết luận ngắn
| Đối tượng | Gộp vào lookup? | Lý do |
|-----------|-----------------|--------|
| `dao_tao_cau_hinh` | **Không** | Cấu hình đề thi (số câu, phút, quota Bloom/JSON, gắn khoa/NV, draft/published) — entity nghiệp vụ, không phải nhãn phẳng |
| `dao_tao_cau_hoi` / `dao_tao_lan_thi` | **Không** | Ngân hàng + lần thi + snapshot |
| Chủ đề NHCH (`chu_de_ma`/`chu_de_ten` nhúng trên câu hỏi) | **Có thể (tuỳ chọn sau)** đưa *chỉ chủ đề* vào lookup `DAO_TAO_CHU_DE` để đổi tên lan theo; hiện đang denormalize text |
| `sys_roles` | **Không** | Trục RBAC: nối `sys_user_roles` + `sys_role_permissions` + `sys_permissions`; đã khóa trên hub |

### Ưu nếu cố gộp (nhìn chung)
- Ít «tên bảng» hơn trên giấy.
- Một UI CRUD giống danh mục khác.

### Nhược / rủi ro thật
- **Phình `metadata` JSONB** thay cột có kiểu → khó ràng buộc, khó báo cáo, khó RLS.
- **Mất FK rõ** role↔permission; đổi nhãn nhầm thành đổi quyền.
- **Đào tạo:** cấu hình đề ≠ danh mục; gộp làm hub «danh mục» chứa cấu hình phức tạp → rối hơn.
- **View vụn hiện nay** với lookup phẳng **không tốn storage bảng** (chỉ alias). Gộp roles/cau_hinh **không** giảm view vụn — chỉ chuyển nợ sang JSON.

### Hướng tinh gọn đúng
1. Giữ 3 bảng đào tạo lean (đã cải tổ 8→3).  
2. Giữ `sys_roles` + ma trận quyền.  
3. (Tuỳ chọn) Chủ đề NHCH → `sys_lookup_value` category `DAO_TAO_CHU_DE`; câu hỏi lưu `chu_de_code`/`id`, hiển thị JOIN `name`.  
4. Hub: tách «Danh mục nhãn» vs «Cấu hình đề» vs «Phân quyền» — đừng nhét một chỗ.
