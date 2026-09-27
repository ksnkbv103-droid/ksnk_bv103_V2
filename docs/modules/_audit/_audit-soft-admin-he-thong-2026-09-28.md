# Soft audit — Quản trị hệ thống (admin) — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Ngày | 2026-09-28 (Asia/Saigon) |
| Máy | Nghĩa Mac · `6bad1c57-5c17-4e62-b661-16f3bab10f88` |
| Repo | `/Users/drnghia/Desktop/ksnk_bv103` |
| Branch | `cursor/me-sync-recall-print` |
| Tip trước | `6253cb4` (ahead 51) |
| Phạm vi | Module Quản trị hệ thống — doors, tạo/quản lý TK, RBAC, overlap |
| Không | push / PR / Cloud / Vercel / migrate / đụng dirty WT |

---

## 1. Survey — surfaces

### Routes (App Router)

| Path | Role | Guard |
|------|------|-------|
| `/quan-tri-he-thong` | Hub jobs + tabs DANH_MUC / PHAN_QUYEN / IT | layout `canAccessQuanTriHub` + client `canSeeQuanTriSection` |
| `/quan-tri-he-thong/nhan-su` | **SSOT** hồ sơ + tạo TK + duyệt phiếu + Đặt lại MK | `NHAN_SU` view (page); provision cần `PHAN_QUYEN` edit / ADMIN |
| `/quan-tri-he-thong/tai-khoan` | Hub nhẹ «Tài khoản & truy cập» (phiếu chờ + shortcuts) | `canAccessTaiKhoanNhanSuRoute` (PHAN_QUYEN edit) |
| `/quan-tri-he-thong/tai-khoan-nhan-su` | **Redirect → `/nhan-su`** (orphan UI kept) | same gate then redirect |
| `/quan-tri-he-thong/phan-quyen` | Redirect hub `?tab=phan_quyen` | `canAccessPhanQuyenRoute` |
| `/quan-tri-he-thong/danh-muc/*` · `/bang-kiem` | MDM dedicated | module / DANH_MUC view |
| `/tai-khoan` · `/tai-khoan/doi-mat-khau` | Self profile / đổi MK | signed-in |
| `/login/xin-cap-tai-khoan` · `tra-cuu-yeu-cau` · forgot/reset | Public phiếu | unauth |

### Nav

- Sidebar: một mục **«Quản trị hệ thống»** (`SIDEBAR_ADMIN_GROUPS` → `/quan-tri-he-thong`), gate OR `DANH_MUC|PHAN_QUYEN|NHAN_SU`.
- Hub 4 jobs: Tổ chức và người → `/nhan-su`; Tài khoản & truy cập → `/tai-khoan`; Bảng kiểm; Sửa danh mục CSSD.

### Create account (SSOT)

1. Form «Thêm người» + checkbox **Tạo đăng nhập ngay** → `provisionStaffAuthAccount` + optional `setStaffKsnkRbacRole` (`afterSaveNhanSuLogin`).
2. Nút **Tạo TK** trên cột Tài khoản (email bắt buộc; hồ sơ `is_active`).
3. Duyệt phiếu REQUEST (login public) → `approveAccountAccessRequest`.
4. **Không** invite-by-email — password ban đầu + `must_change_password`; email uniqueness = Auth createUser.

### Manage account

- List/search/filter khoa·tổ·chức vụ… + **Chỉ chờ duyệt** (`?pending=1`).
- Soft-disable hồ sơ: `is_active` (login staff chặn khi inactive). **Không** ban Auth user riêng (P2 park).
- **Đặt lại MK** / duyệt RESET: actions sẵn; UI trước đây chỉ trên orphan `TaiKhoanNhanSuPage` → **P0 blocker** (đã Soft-fix).
- Role: form `vai_tro_he_thong` → map assignable KSNK roles; matrix tại hub tab Phân quyền.

### RBAC matrix vs reality

| Layer | Reality |
|-------|---------|
| Matrix UI | Hub tab `PHAN_QUYEN` — 5 cột ADMIN / Hội đồng / NV / Mạng lưới / Khách |
| Staff assignable | Không gán ADMIN qua UI staff; `RBAC_STAFF_ASSIGNABLE_*` |
| Route guards | Server `quan-tri-access` + client `usePermission` / `useModulePermission` |
| Actions | `ensureRbacAdmin` = trusted email \| ADMIN role \| `PHAN_QUYEN` edit |
| Nav | Khớp hub OR gates |

### Cross-links / pickers

- Modules (QLCV assignee, GSC/VST observer, CSSD su-co staff, Đào tạo) đọc `mdm_nhan_su` — **không** duplicate admin user UI.
- Overlap admin: chỉ orphan `TaiKhoanNhanSuPage` (redirected) + hub `/tai-khoan` (launchpad, OK).

---

## 2. Gap table

| Area | Current | Gap | Overlap? |
|------|---------|-----|----------|
| Hub IA + 4 jobs | Solid, 1 sidebar door | OK | No |
| Create TK (form) | Password + role on save | OK | No |
| Create TK (list) | Was `window.prompt` | **P1** → Soft: `StaffAuthPasswordDialog` create | vs form path (same action) |
| Account list/filter/pending | NhanSuTable | OK | No |
| Đặt lại MK | Action OK; UI orphan only | **P0** → Soft: button + dialog on `/nhan-su` | Orphan page |
| Duyệt RESET phiếu | Action `approveForgotResetRequest`; submit handler blocked | **P0** → Soft: wire approve_reset | Copy pointed «Tài khoản» |
| Disable/reactivate | `is_active` + login gate | **P2** — no Auth ban/cascade | Soft-delete profile only |
| Role matrix vs guards | Aligned 5 roles + packs | OK | No |
| Khoa/đơn vị cascade | Form FK + write helpers | OK thin | No |
| Orphan `/tai-khoan-nhan-su` UI | Redirect; page file kept | **P2** keep (reference) | Duplicate UI dead |
| Stale copy «Người dùng và quyền» | after-save toast | **P1** → Soft fix | Naming |
| Duplicate user pickers in ops | Shared MDM reads | OK | No invent |

---

## 3. A/B (anti-bias)

### P0 — Đặt lại MK / duyệt RESET unreachable

| | Option | Pros | Cons |
|---|--------|------|------|
| **A** | Wire create/reset/approve_reset onto `NhanSuTable` via existing `StaffAuthPasswordDialog` | Thin; one door; reuses actions; matches IA «gộp vào Nhân sự» | Touches one busy file |
| B | Un-redirect `/tai-khoan-nhan-su` restore full list UI | Instant restore | Re-opens overlap «2 UIs users»; contradicts slice-6 comment |

**Chose A** — Soft-safe, clear admin practice, no Domain.

### P1 — Create TK UX

| | Option | |
|---|--------|--|
| **A** | Replace `window.prompt` with dialog mode=`create` (confirm password) | Same dialog as approve |
| B | Leave prompt | Thin but inconsistent / insecure UX |

**Chose A** (bundled with P0).

---

## 4. Fix applied (Soft)

- `NhanSuTable.tsx`: dialog modes create / reset / approve_request / approve_reset; list buttons **Tạo TK** · **Đặt lại MK** · **Duyệt đặt lại MK**; self-reset → `requireSecondApprover`.
- `nhan-su-after-save-login.ts`: toast trỏ đúng «Tạo TK» trên Nhân sự.
- **No** migrate · **no** Domain RBAC redesign · orphan page file kept with redirect.

---

## 5. Verify / UAT (Nghĩa)

1. Admin: `/quan-tri-he-thong` → job «Tổ chức và người» → `/nhan-su`.
2. Thêm người + Tạo đăng nhập (email + MK ≥8 + vai trò) → login được, must_change_password.
3. Hồ sơ chưa TK: **Tạo TK** → dialog (không prompt) → Đã có TK.
4. Hồ sơ đã TK: **Đặt lại MK** → re-auth admin → user login MK mới.
5. Phiếu chờ RESET (`?pending=1`): **Duyệt đặt lại MK** / Từ chối.
6. Tab Phân quyền: sửa cell → user role tương ứng mất/được module.
7. Soft-off `is_active` → login staff bị chặn; bật lại → vào được.
8. User thường: không thấy nút Tạo TK / Đặt lại MK (thiếu PHAN_QUYEN edit).

---

## 6. Parked Domain / PO

- Auth **ban** when soft-disable hồ sơ (vs chỉ `is_active` login gate).
- Dual-admin live approve self-reset (hiện ghi nhận email thứ 2).
- Delete orphan `TaiKhoanNhanSuPage` / `TaiKhoanNhanSuStaffRow` files (optional hygiene).
- Invite-by-email flow (product chưa có; password-provision là lock hiện tại).

*End Soft admin audit · local only.*
