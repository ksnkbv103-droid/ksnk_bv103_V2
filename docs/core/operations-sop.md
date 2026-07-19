# CẨM NANG VẬN HÀNH, BẢO MẬT & DB THỐNG NHẤT — KSNK BV103

> **Phiên bản:** 1.0 (20/05/2026)  
> **Trạng thái:** Hoạt động (SSOT Bảo mật, Vận hành & Dữ liệu)  
> **Được hợp nhất từ:** Các SOP vận hành, bảo mật và cơ sở dữ liệu cũ (`DB_SYNCHRONIZATION_SOP.md`, `VANHANH_AUTH_RBAC_KSNK.md` và các sổ tay dữ liệu cũ).

---

## 1. Hướng dẫn Vận hành Auth & Phân vai trò (RBAC)

Hệ thống y tế KSNK BV103 quản lý tài khoản người dùng tích hợp với mã định danh nhân viên thông qua phân hệ quản trị hệ thống (`quan-tri-he-thong/tai-khoan-nhan-su/`).

### 1.1 Khớp nối Nhân sự y tế & Tài khoản
* Thông tin nhân sự lâm sàng được lưu trữ tại bảng lõi **`mdm_nhan_su`**, liên kết chặt chẽ với ID xác thực của Supabase (`auth_user_id`).
* Địa chỉ email y tế (`email`) được chuẩn hóa định dạng chữ thường, tự động kiểm tra tính duy nhất trên môi trường hoạt động thông qua ràng buộc cơ sở dữ liệu.

### 1.2 Ma trận phân vai trò y tế (Role-Based Access Control - RBAC)

SSOT tên vai trò: bảng **`sys_roles.name`**. Cấu hình ma trận: `/quan-tri-he-thong?tab=phan_quyen`. Đồng bộ preset KSNK: action **Đồng bộ vai trò KSNK** (`rbac-ksnk-role-mappings.ts`).

| Vai trò (`sys_roles.name`) | Mô tả nghiệp vụ | Module quyền tiêu biểu |
| :--- | :--- | :--- |
| **`ADMIN`** | Quản trị hệ thống — toàn quyền cấu hình | Mọi module trong `permission-registry-data.ts` |
| **`NHAN_VIEN_KSNK`** | Nhân viên khoa Kiểm soát nhiễm khuẩn — vận hành lõi | Giám sát (VST/GSC/NKBV), CSSD, danh mục (xem/sửa theo module), QLCV, nhân sự, bảng kiểm |
| **`HOI_DONG_KSNK`** | Hội đồng KSNK — chủ yếu xem báo cáo | Chỉ action `view` trên mọi module |
| **`MANG_LUOI_KSNK`** | Mạng lưới KSNK theo khoa (một vai trò cho tổ trưởng + thành viên) — nhập liệu tại khoa; **Thống kê** VST/GSC (`/thong-ke/*`) | Giám sát VST/GSC (CRUD), QLCV, báo cáo sự cố — **không** Command Center / Báo cáo tổng hợp |
| **`KHACH_THONG_KE_GSTT`** | Khách — tài khoản chung chỉ xem thống kê | Chỉ `view` trên `GIAM_SAT_VST` + `GIAM_SAT_CHUNG`; `/thong-ke/vst`, `/thong-ke/gsc` |

> **Không còn gán:** `TO_TRUONG_MANG_LUOI_KSNK`, `THANH_VIEN_MANG_LUOI_KSNK` (đã gộp → `MANG_LUOI_KSNK`); `BAN_QLCL`, `KHOA_TRANG_BI` (soft-deprecate — không thuộc bộ vai trò KSNK). Migration `20260718100000`.

**Module quyền** (không phải vai trò): `GIAM_SAT_VST`, `GIAM_SAT_CHUNG`, `CSSD_WORKFLOW`, `DANH_MUC`, `PHAN_QUYEN`, … — xem [`permission-registry-data.ts`](../../src/lib/permission-registry-data.ts).

Mọi phân vai trò được bảo vệ ở app (`verifyPermission`) và DB (RLS qua `fn_sys_has_permission`).

### 1.3 Đồng bộ Permission Registry ↔ DB (Phase 2b)

SSOT mã quyền: [`permission-registry-data.ts`](../../src/lib/permission-registry-data.ts). Bảng vật lý: `sys_permissions`, `sys_role_permissions`.

| Bước | Local | Staging / linked |
|------|-------|------------------|
| Kiểm tra parity | `npm run admin:rbac:parity:local` | `npm run admin:rbac:parity` (cần `.env.local` + Supabase linked) |
| Đồng bộ | `npm run admin:rbac:sync:local` (chỉ registry) hoặc `npx tsx scripts/admin-rbac-sync.ts --local --with-presets` / `local:golden:reset` | UI **Đồng bộ Registry**; preset riêng nút **Áp dụng preset** hoặc CLI `--with-presets` |
| Deploy schema | `npm run mdm:migrate:local` | `npm run mdm:migrate` (linked cloud — cần token) |
| Lệch lịch sử cloud | — | Nếu `Remote migration versions not found…`: đối chiếu `supabase migration list`; **không** `repair` bừa — chỉ repair version orphan sau khi PO/IT xác nhận (vd. `20260717063027`) |
| Xác nhận ADMIN | `admin_granted` = `db_permission_count` = số quyền registry | Cùng metric trong output parity |
| Auth pilot | `npm run trial:auth:precheck:local` | `npm run trial:auth:precheck` |

**Khi nào chạy:** Sau deploy có thêm module/action mới trong registry; khi `parity_ok: false`.

| Thao tác | UI | CLI | Hiệu ứng |
|----------|----|-----|----------|
| **Đồng bộ Registry** | Nút cùng tên | `npm run admin:rbac:sync(:local)` | Upsert `sys_permissions` + full ADMIN — **không** ghi đè Hội đồng / NV / Mạng lưới / Khách |
| **Áp dụng preset vai trò** | Nút cùng tên (confirm) | `…sync… --with-presets` | Ghi đè mapping 4 vai trò KSNK active theo `rbac-ksnk-role-mappings.ts` |

**Staging 401 linked:** Kiểm tra `SUPABASE_ACCESS_TOKEN` / `supabase link` trước khi chạy parity linked; local vẫn dùng Docker (`npx supabase start`).

**Cache quyền:** Server 5 phút + `invalidateUserPermissionsCache` khi lưu ma trận/gán vai trò; client refetch khi điều hướng / focus tab / poll 30s (`RbacRefreshListener`).

---

## 2. Quy chuẩn Đồng bộ Dữ liệu & Kiểm soát Schema (SOP DB)

Để loại bỏ hoàn toàn lỗi gãy ứng dụng (crash runtime) do lệch cấu trúc bảng (schema drift), mọi thành viên phát triển bắt buộc phải tuân thủ quy trình đồng bộ DB nghiêm ngặt:

### 2.1 Nguyên tắc "3 KHÔNG" về Dữ liệu
1. **KHÔNG chạy SQL "nóng" bằng tay** trực tiếp trên database remote (Staging, Production/Pilot) mà không tạo file migration.
2. **KHÔNG merge Pull Request đụng DB** khi chưa chạy thành công precheck kiểm tra tính toàn vẹn dữ liệu.
3. **KHÔNG dùng tài liệu tĩnh làm SSOT**. Lịch sử file migration trong git (`supabase/migrations/`) và database thực tế mới là Single Source of Truth duy nhất.

### 2.1.1 Ma trận môi trường (migration parity) — cập nhật 2026-06-09

| Môi trường | Lệnh kiểm tra head | Ghi chú |
|------------|-------------------|---------|
| **Local** | `npx supabase migration list --local` | Docker + `npm run mdm:migrate:local`. Head repo = **87** file (`20260702100000`). Golden verify: `npm run local:golden:verify` (SOP §2.1.2). |
| **Linked staging** | `npm run mdm:migrate` | `npm run trial:db:precheck`, `npm run smoke:gsc-vst`, `npm run gstt:db:audit`, `npm run ssot:db:guard`. |
| **Repo SSOT** | `ls supabase/migrations/*.sql` | Tên file = nguồn sự thật; không apply SQL tay trên remote. |

**Local không chạy được:** Nếu `connection refused` port 54322 → bật Docker Desktop, chạy `npx supabase start`. Không audit EXPLAIN/size trên local khi DB down — dùng linked staging tạm thời.

**Auth server-side:** Next.js 16+ dùng [`src/proxy.ts`](../../src/proxy.ts) (không `middleware.ts` — xem [middleware-to-proxy](https://nextjs.org/docs/messages/middleware-to-proxy)) — `getUser()` trước RSC; không chỉ `ClientLayoutWrapper`.

### 2.1.2 Môi trường local “vàng” (pilot / demo) — cập nhật 2026-07-03

Sau mỗi lần reset DB local, chạy đủ chuỗi sau để RBAC, nhân sự và probe orphan = 0:

```bash
# Một lệnh (reset + migrate + đồng bộ quyền)
npm run local:golden:reset

# Tuỳ chọn — dữ liệu demo CSSD (pilot P3–P5)
npm run cssd:demo:reset:local

# Xác nhận 11 probe DB/auth/RBAC + view orphan
npm run local:golden:verify
```

| Bước | Lệnh | Mục đích |
|------|------|----------|
| 1 | `npx supabase db reset --local` | Migration + seeds (`00-rbac.sql`, `01-pilot-nhan-su.sql`) |
| 2 | `npm run mdm:migrate:local` | Head repo = DB local |
| 3 | `npm run admin:rbac:sync:local` | Registry quyền → `sys_permissions` |
| 4 | `npm run cssd:demo:reset:local` | (Tuỳ chọn) Demo quy trình CSSD |
| 5 | `npm run local:golden:verify` | 11 probe: SSOT, audit trigger, auth, GSTT, orphan sweep, CSSD, RBAC, QLCV, **audit:views** |

**Đăng nhập pilot:** tài khoản trong `supabase/seeds/01-pilot-nhan-su.sql` (sau reset). `trial:auth:precheck:local` phải báo `mdm_email_no_auth` = **0**.

### 2.2 Quy trình 4 bước Đồng bộ Database
1. **Tạo Migration local:** Sử dụng lệnh `npx supabase migration new <ten_nghiep_vu>` để khởi tạo file SQL mới.
2. **Migrate cục bộ:** Sử dụng lệnh `npm run mdm:migrate:local` để apply thay đổi lên môi trường local và chạy unit test kiểm chứng logic.
3. **Chạy Precheck Schema:** Chạy lệnh `npm run trial:db:precheck:local` để xác thực toàn bộ RPC, View và khóa ngoại (FK) cần thiết.
4. **Deploy & Sync Remote:** Chạy lệnh `npm run mdm:migrate` để apply đồng bộ lên DB remote y tế, kết hợp kiểm tra hậu migration (`npm run mdm:postcheck:sql`).
5. **Auth pilot:** `npm run trial:auth:precheck` (linked) — khớp `auth.users` ↔ `mdm_nhan_su.email`.

---

## 3. Sổ tay Tối ưu Cơ sở dữ liệu (Smart DB Playbook)

Để tối ưu hóa tốc độ phản hồi lâm sàng, hệ thống áp dụng các kỹ thuật thiết kế Database thực dụng:
* **Tận dụng tối đa View (`v_*_full`):** Gom các liên kết join phức tạp giữa bảng `fact_*` và danh mục `dm_*` vào tầng cơ sở dữ liệu, giúp mã nguồn Next.js chỉ việc select đơn giản, tăng khả năng bảo trì.
* **Index có chủ đích (Covering Indexes):** Thiết lập chỉ mục trên các cột khóa ngoại lâm sàng thường xuyên bị lọc (như `khoa_id`, `ngay_giam_sat`, `ma_loai_danh_muc`) để tối ưu hóa thời gian thực thi của RPC.
* **Kiểm soát Supabase Admin Client (Service Role Bypass):** Hạn chế tối đa việc sử dụng Supabase Admin Client có quyền năng tối cao (`service_role` key) ở phía Server Next.js. Mọi trường hợp bắt buộc phải sử dụng cần được thẩm định bảo mật kỹ lưỡng và chỉ khai báo tại các Server Action nội bộ được cô lập hoàn toàn.
