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

