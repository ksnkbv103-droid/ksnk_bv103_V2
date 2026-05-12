# Audit `createAdminSupabaseClient` — KSNK BV103

Cập nhật: 08/05/2026 (quét `src/**/*.ts` + `src/**/*.tsx`, **không** tính `node_modules`).

**Luật nền:** `createAdminSupabaseClient()` = **service role** → **bypass RLS**. Chỉ hợp lệ khi: (a) đã **gate** tầng app (`verifyPermission` / `verifyPermissions` / Auth Admin API), hoặc (b) thao tác **bắt buộc** service role (ví dụ `auth.admin`, bulk import có policy đặc biệt).

**Cột “Cần admin?”**

| Giá trị | Ý nghĩa |
|--------|---------|
| **Có** | Hiện tại **nên giữ** admin (API đặc thù, bulk, hoặc chưa có RLS đủ nhưng đã gate). |
| **Xem lại** | Có thể chuyển dần sang `createServerSupabaseUserClient()` nếu bổ sung **RLS + policy** đúng scope. |
| **Hỗn hợp** | Cùng file: chỗ dùng user, chỗ dùng admin — cần tách hoặc ghi chú rõ. |
| **Không** | File action **không** gọi `createAdminSupabaseClient` (chỉ user client hoặc không đụng Supabase). |

---

## 1. `src/lib` (lõi)

| File | Vai trò | Cần admin? | Ghi chú |
|------|---------|------------|---------|
| `lib/supabase-server.ts` | Định nghĩa factory | — | Nguồn gốc; đọc comment trong file. |
| `lib/server-permission.ts` | Đọc `v_auth_user_permissions` (cache) | **Có** | Pattern tập trung; tương lai có thể thay bằng RPC `SECURITY DEFINER` + user JWT. |
| `lib/cache/master-data-cache.ts` | Cache đọc MDM / danh mục | **Có** | Callback `unstable_cache` có thể chạy ngoài request có cookie → không dùng user JWT; giữ admin cho danh mục tĩnh (không PII nhạy), route gọi cache vẫn gate `verifyPermission`. |

---

## 2. `src/modules/auth`

| File | Cần admin? | Ghi chú |
|------|------------|---------|
| `auth/actions/staff-login.actions.ts` | **Có** | Tra cứu / tạo user Auth — thường cần `auth.admin`. |
| `auth/actions/staff-session.actions.ts` | **Không** | Chỉ `createServerSupabaseUserClient` (đã bỏ import admin thừa). |

---

## 3. `src/modules/dashboard`

| File | Cần admin? | Ghi chú |
|------|------------|---------|
| *(không có hit)* | — | Dashboard đọc qua client khác hoặc RPC/user. |

---

## 4. `src/modules/giam-sat-chung`

| File | Cần admin? | Ghi chú |
|------|------------|---------|
| `actions/giam-sat-chung-read.actions.ts` | **Hỗn hợp** | List history: user client; `getGscHeaderDmDropdowns`: admin + RPC + cache. |
| `actions/giam-sat-chung-write.actions.ts` | **Có** | Ghi fact sau verify. |
| `actions/giam-sat-chung-import.actions.ts` | **Có** | Import lô. |
| `actions/giam-sat-chung-print-labels.actions.ts` | **Có** | In / đọc gói dữ liệu sau verify. |
| `actions/giam-sat-chung-session-meta.actions.ts` | **Có** | Meta phiên sau verify. |

---

## 5. `src/modules/giam-sat-vst`

| File | Cần admin? | Ghi chú |
|------|------------|---------|
| `actions/vst-write-seen.actions.ts` | **Có** | Cập nhật trạng thái xem. |
| `actions/vst-write-import.actions.ts` | **Có** | Import. |
| `actions/vst-write-save-session.actions.ts` | **Có** | Lưu phiên. |
| `actions/vst-write-delete.actions.ts` | **Có** | Xóa mềm / ghi sau verify. |

---

## 6. `src/modules/giam-sat-nkbv`

| File | Cần admin? | Ghi chú |
|------|------------|---------|
| `actions/giam-sat-nkbv-read.actions.ts` | **Hỗn hợp** | List paginated: user client; bundle DM / `listAllMaNkbvCas`: admin. |
| `actions/giam-sat-nkbv-write.actions.ts` | **Có** | CRUD ca bệnh sau verify. |

---

## 7. `src/modules/quan-ly-cong-viec`

| File | Cần admin? | Ghi chú |
|------|------------|---------|
| `actions/cong-viec-write.actions.ts` | **Hỗn hợp** | Một số nhánh dùng user client, một số dùng admin (join / ghi sau verify). |
| `actions/cong-viec-import.actions.ts` | **Có** | Import lô. |

---

## 8. `src/modules/quan-tri-he-thong`

| File | Cần admin? | Ghi chú |
|------|------------|---------|
| `actions/master-crud-safe-core.ts` | **Có** | CRUD danh mục an toàn — pattern admin sau gate. |
| `danh-muc/actions/khoa-phong.actions.ts` | **Có** | Quản trị khoa. |
| `danh-muc/actions/master-crud-core.ts` | **Có** | CRUD lõi. |
| `danh-muc/actions/export.actions.ts` | **Có** | Export thường cần quyền rộng. |
| `danh-muc/actions/danh-muc-query.actions.ts` | **Không** | Đọc qua `createServerSupabaseUserClient` sau `verifyPermission`; RLS bảng `dm_*` / `mdm_*` hub quản trị (policy `*_select_auth_v1`, migration `20260508140000`). |
| `danh-muc/actions/danh-muc.actions.ts` | **Có** | Ghi danh mục. |
| `danh-muc/actions/master-data-gateway.actions.ts` | **Hỗn hợp** | Có user + admin tùy hàm. |
| `danh-muc/actions/danh-muc-hybrid.actions.ts` | **Có** | Hybrid read/ghi. |
| `danh-muc/actions/smart-import.actions.ts` | **Có** | Import. |
| `danh-muc/actions/mdm-governance.actions.ts` | **Có** | Governance MDM. |
| `danh-muc/actions/bo-dung-cu.actions.ts` | **Có** | CRUD phức tạp. |
| `danh-muc/actions/dung-cu-chi-tiet.actions.ts` | **Có** | Chi tiết dụng cụ. |
| `danh-muc/actions/bo-dung-cu-chi-tiet-read.actions.ts` | **Không** | Đọc/ghi ghi chú issue qua user client; policy SELECT/UPDATE `dm_bo_dung_cu_chi_tiet` + SELECT `dm_loai_dung_cu` (cùng migration). |
| `danh-muc/actions/generic-dm.actions.ts` | **Có** | Generic DM. |
| `danh-muc/actions/thiet-bi.actions.ts` | **Có** | Thiết bị. |
| `danh-muc/actions/loai-dung-cu.actions.ts` | **Có** | Loại dụng cụ. |
| `nhan-su/actions/nhan-su-read.actions.ts` | **Không** | Đọc qua user client (`v_mdm_nhan_su_full`, `mdm_nhan_su`, RPC/registry) sau `verifyPermission`; bảng nền `mdm_nhan_su` có policy SELECT authenticated. |
| `nhan-su/actions/nhan-su-write.actions.ts` | **Có** | Ghi nhân sự. |
| `phan-quyen/actions/rbac.actions.ts` | **Có** | RBAC / ma trận quyền. |
| `phan-quyen/actions/rbac-auth.helpers.ts` | **Hỗn hợp** | Helper auth + admin. |
| `tai-khoan-nhan-su/actions/tai-khoan-nhan-su.actions.ts` | **Có** | Tạo TK Auth — `auth.admin`. |
| `tai-khoan-nhan-su/actions/account-link-governance.actions.ts` | **Có** | Liên kết tài khoản. |
| `bang-kiem/actions/bang-kiem-read.actions.ts` | **Hỗn hợp** | **Backlog:** một số nhánh vẫn admin sau verify — đánh giá RLS từng bảng checklist trước khi chuyển hết sang user. |
| `bang-kiem/actions/bang-kiem-write.actions.ts` | **Có** | Ghi bảng kiểm. |
| `bang-kiem/actions/bang-kiem-import.actions.ts` | **Có** | Import. |

---

## 9. `src/modules/cssd-erp`

| File | Cần admin? | Ghi chú |
|------|------------|---------|
| `actions/cssd-read.actions.ts` | **Có** | Đọc workflow / import-export sau verify. |
| `actions/cssd-write.actions.ts` | **Có** | Ghi quy trình / import. |
| `actions/cssd-scan.actions.ts` | **Hỗn hợp** | Quét — có user + admin. |
| `actions/cssd-batch.actions.ts` | **Có** | Mẻ TK / batch. |
| `actions/cssd-workflow.commands.actions.ts` | **Hỗn hợp** | Lệnh workflow. |
| `actions/cssd-workflow-ops.actions.ts` | **Hỗn hợp** | Ops QR / unlock. |
| `actions/cssd-asset.actions.ts` | **Có** | Tài sản / thiết bị CSSD. |
| `actions/cssd-register-label.actions.ts` | **Có** | Đăng ký nhãn. |
| `actions/cssd-bao-tri-list.actions.ts` | **Có** | Danh sách bảo trì. |
| `actions/cssd-bao-tri-mutations.actions.ts` | **Có** | Ghi bảo trì. |
| `actions/cssd-kho-hoa-chat-list.actions.ts` | **Có** | Kho HC — view tồn + giao dịch sau verify. |
| `actions/cssd-kho-hoa-chat-mutations.actions.ts` | **Có** | Nhập/xuất kho HC. |
| `actions/cssd-catalog.actions.ts` | **Có** | Catalog kho. |

---

## 10. Ngoài `src` (tham khảo)

| File | Ghi chú |
|------|---------|
| `scratch/p2-flow-verify.ts` | Script cục bộ — **không** là production path. |

---

## Đối soát nhanh — Quản trị ↔ `10-bv103-implementation-mapping` (08/05/2026)

| Màn / module (mapping) | Bảng / view chính | Ghi chú |
|------------------------|-------------------|---------|
| Nhân sự | `mdm_nhan_su`, `v_mdm_nhan_su_full` | Khớp mapping dòng MDM Nhân sự; list dùng view + phân trang server (~20 dòng). |
| Hub danh mục / bộ DC | `dm_khoi_khoa`, `dm_khoa_phong`, `dm_bo_dung_cu`, `dm_bo_dung_cu_chi_tiet`, … | Khớp `InstrumentSet` → `dm_bo_dung_cu*`; policy SELECT (và UPDATE chi tiết khi ghi chú issue) trong `20260508140000_quan_tri_rls_select_dm_mdm.sql`. |

**Việc cần trên môi trường:** apply migration trên (hoặc `supabase db push`) để user client không bị chặn RLS.

---

## Hướng xử lý backlog (không làm một lần)

1. Ưu tiên **Xem lại** ở các **read action** thuần (danh mục, nhân sự, bảng kiểm) nếu RLS đã định nghĩa rõ.
2. Giữ **Có** cho: Auth admin, import lô, RBAC, ghi `fact_*` sau verify (cho tới khi RLS + test đầy đủ).
3. Mỗi thay đổi client: cập nhật **dòng tương ứng** trong bảng này + một câu trong mô tả PR.
