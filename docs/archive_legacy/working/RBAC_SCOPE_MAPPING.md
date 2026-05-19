# RBAC Scope Mapping

> **Neo:** SSOT quyền = `src/lib/permission-registry.ts` + [`AGENTS.md`](../../../AGENTS.md) §2.

Cap nhat: 28/04/2026  
Nguon tham chieu chinh: [`../legacy-only/DATA_FLATTEN_REFERENCE.md`](../legacy-only/DATA_FLATTEN_REFERENCE.md) (RBAC schema + scope)
Nguon doi chieu chien luoc: `PROGRESS_REPORT.md` (root) + `AGENTS.md`

## 1) Muc tieu
- Chot mapping role -> pham vi du lieu -> hanh dong.
- Trien khai nhat quan qua `permission-registry` va gate server action.

## 2) Role baseline (de map vao he thong hien tai)

| Role key | Scope data | Quyen cot loi |
|---|---|---|
| `admin_he_thong` | TOAN_HE_THONG | READ, WRITE, UPDATE, DELETE, BACKUP |
| `lanh_dao_ksnk` | TOAN_BENH_VIEN | READ, APPROVE_REPORT, DASHBOARD_VIEW |
| `truong_khoa_lam_sang` | KHOA_PHONG_NOI_BO | READ, EXPORT_SCOPE |
| `giam_sat_vien_ksnk` | KHOA_PHONG_NOI_BO/CA_NHAN | READ, WRITE, SUBMIT_OBSERVATION |
| `nhan_vien_y_te` | CA_NHAN | READ_OWN, UPDATE_OWN_LIMITED |

### 2b) Vai tro Postgres (`roles.name`) — seed `20260519002_seed_ksnk_domain_roles.sql` + menu Sidebar

| `roles.name` | Menu / nhanh thuc te |
|---|---|
| `ADMIN` | Toan quyen; menu Quan tri neu co PHAN_QUYEN hoac DANH_MUC (thuong dong bo du quyen). |
| `NHAN_VIEN_KSNK` | Dashboard, VST, GSC, Cong viec, CSSD (workflow, kho, bao cao, me tiet khuan), bao su co xem/tao. |
| `TO_TRUONG_MANG_LUOI_KSNK` / `THANH_VIEN_MANG_LUOI_KSNK` | Dashboard + xem so lieu GSC/VST + cong viec (xem/them/sua). Khong menu Quan tri. |
| `HOI_DONG_KSNK` | Chi Dashboard (bao cao tong quan). |
| `MANG_LUOI_KSNK` (legacy) | Hook `isMangLuoi` van nhan dien; nen map user sang ten moi khi chuan hoa. |

Module `DASHBOARD` (action `view`) them vao `permission-registry` de RBAC sync tao hang `permissions`.

## 3) Nguyen tac thuc thi
- `permission-registry` la SSOT, khong hard-code `if role === ...` trong UI/action.
- Moi server action ghi du lieu phai check role + scope truoc khi thuc hien.
- Scope uu tien map theo khoa/nguoi tao:
  - department scope: `department_id = auth.jwt().department_id`
  - personal scope: `created_by = auth.uid()`

## 4) Mapping module-level (khoi tao)

| Module | admin_he_thong | lanh_dao_ksnk | truong_khoa_lam_sang | giam_sat_vien_ksnk | nhan_vien_y_te |
|---|---|---|---|---|---|
| CSSD ERP | full | read/approve | read_department | write_department | read_limited |
| Giam sat VST | full | read/export | read_department | write_department | write_own |
| Giam sat chung | full | read/export | read_department | write_department | write_own |
| Quan ly cong viec | full | full_department | read_department | write_assigned | write_assigned |
| Quan tri danh muc | full | read | read | none | none |

## 5) Khac/Trung voi PROGRESS_REPORT.md (root)
- Trung:
  - Tu tuong SSOT qua `permission-registry`.
  - Dinh huong Dynamic RBAC va phan quyen theo module.
- Khac (file nay bo sung):
  - Co bang mapping role-scope-action cu the de code duoc ngay.
  - Co quy tac scope cap query/action (department/personal).
  - Co module-level matrix de dung cho implementation va test.

## 6) Gate truoc release
- [ ] Da map role key vao `permission-registry` hien hanh.
- [ ] Da test role matrix cho 5 module chinh.
- [ ] Da test dung scope (khong doc/ghi vuot khoa/nguoi dung).
- [ ] Da cap nhat UI an/hien theo permission thay vi hard-code.
