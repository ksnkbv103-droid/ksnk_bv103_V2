# TÀI LIỆU CHUYỂN GIAO PHẦN MỀM KSNK BV103

## Phần 1: Tổng quan nền tảng & Kiến trúc hệ thống

> **Mục đích:** Cung cấp đầy đủ thông tin để một đơn vị phát triển mới có thể hiểu và triển khai lại toàn bộ hệ thống.
> **Cập nhật:** 18/05/2026

---

## 1. TỔNG QUAN SẢN PHẨM

### 1.1 Mô tả

**KSNK BV103** (Kiểm soát Nhiễm khuẩn — Bệnh viện Quân y 103) là hệ thống quản lý nghiệp vụ kiểm soát nhiễm khuẩn bệnh viện, bao gồm:

- **Giám sát tuân thủ vệ sinh tay** (WHO 5 Moments)
- **Giám sát chung bằng bảng kiểm** (checklist động)
- **Giám sát nhiễm khuẩn bệnh viện** (NKBV/HAI)
- **Quản lý CSSD** (Central Sterile Supply Department — tái xử lý dụng cụ y tế)
- **Quản lý công việc nội bộ** Khoa KSNK
- **Dashboard chỉ huy** (Command Center) tổng hợp KPI
- **Quản trị hệ thống** (danh mục, nhân sự, phân quyền, bảng kiểm)

### 1.2 Đối tượng người dùng

| Vai trò | Mô tả |
|---------|-------|
| **ADMIN** | Quản trị viên toàn quyền |
| **NHAN_VIEN_KSNK** | Nhân viên Khoa Kiểm soát nhiễm khuẩn — giám sát chuyên trách |
| **TO_TRUONG_MANG_LUOI_KSNK** | Tổ trưởng mạng lưới KSNK tại khoa |
| **THANH_VIEN_MANG_LUOI_KSNK** | Thành viên mạng lưới — tự giám sát |
| **CHI_HUY_KHOA** | Lãnh đạo khoa phòng |
| **GIAM_DOC** | Ban giám đốc — xem báo cáo |
| **CAN_BO_KSNK** | Cán bộ KSNK |
| **GIAM_SAT_VIEN** | Giám sát viên |
| **NHAN_VIEN_KHOA** | Nhân viên khoa — quyền hạn chế |

---

## 2. CÔNG NGHỆ & NỀN TẢNG

### 2.1 Technology Stack

| Lớp | Công nghệ | Phiên bản |
|-----|-----------|-----------|
| **Framework** | Next.js (App Router) | 16.2.4 |
| **UI Library** | React | 19.2.4 |
| **Language** | TypeScript | ^5 |
| **Styling** | TailwindCSS | ^4 |
| **Database** | PostgreSQL (Supabase hosted) | — |
| **Auth** | Supabase Auth (email/password) | — |
| **Backend** | Next.js Server Actions (không dùng REST API) | — |
| **ORM/Client** | @supabase/supabase-js + @supabase/ssr | ^2.104 / ^0.5.2 |
| **Charts** | Recharts | ^3.8.1 |
| **Forms/Validation** | Zod | ^4.4.3 |
| **UI Components** | Radix UI (Dialog, Tabs, Slot) | — |
| **Icons** | Lucide React | — |
| **Excel Import/Export** | ExcelJS + xlsx | — |
| **QR Code** | html5-qrcode (scan) + qrcode (generate) | — |
| **Toast** | Sonner | — |
| **Font** | Inter (Google Fonts) | — |
| **Testing** | Vitest | ^4.1.5 |
| **Deploy** | Vercel | — |
| **Database hosting** | Supabase Cloud | — |

### 2.2 Biến môi trường

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_JWT_HERE
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_JWT_HERE
NEXT_PUBLIC_SITE_URL=http://localhost:3000          # Tùy chọn
NEXT_PUBLIC_DEBUG_SUPABASE=0                         # Tùy chọn
KSNK_PILOT_FOUR_MODULES=1                           # Tùy chọn: chặn module chưa pilot
```

### 2.3 Scripts quan trọng

| Script | Mô tả |
|--------|-------|
| `npm run dev` | Chạy dev server (webpack) |
| `npm run build` | Build production |
| `npm run verify:engineering` | Kiểm tra engineering baseline + contract gate |
| `npm run verify:full` | Lint + CSSD test + engineering + build |
| `npm run mdm:migrate` | Push migration lên Supabase remote |
| `npm run mdm:migrate:local` | Push migration lên Supabase local |
| `npm run pilot:ship` | Full pipeline trước deploy |

---

## 3. CẤU TRÚC THƯ MỤC DỰ ÁN

```
ksnk_bv103/
├── src/
│   ├── app/                          # Next.js App Router (pages & layouts)
│   │   ├── (auth)/                   # Route group: login, đổi mật khẩu
│   │   ├── (dashboard)/              # Route group: trang chủ Command Center
│   │   ├── giam-sat-vst/             # Giám sát vệ sinh tay
│   │   ├── giam-sat-chung/           # Giám sát bảng kiểm chung
│   │   ├── giam-sat-nkbv/            # Giám sát nhiễm khuẩn BV
│   │   ├── cssd-quy-trinh/           # CSSD quy trình quét trạm
│   │   ├── cssd-dung-cu/             # CSSD kho dụng cụ
│   │   ├── cssd-thiet-bi/            # CSSD thiết bị & bảo trì
│   │   ├── cssd-hoa-chat/            # CSSD kho hóa chất
│   │   ├── cssd-su-co/               # CSSD sự cố
│   │   ├── cssd-erp/                 # CSSD báo cáo (legacy route)
│   │   ├── quan-tri-he-thong/        # Quản trị hệ thống
│   │   ├── tai-khoan/                # Quản lý tài khoản cá nhân
│   │   ├── layout.tsx                # Root layout
│   │   └── globals.css               # CSS tokens toàn app
│   │
│   ├── modules/                      # Business logic theo bounded context
│   │   ├── auth/                     # Xác thực
│   │   ├── dashboard/                # Dashboard Command Center
│   │   ├── giam-sat-vst/             # Module giám sát VST
│   │   ├── giam-sat-chung/           # Module giám sát chung
│   │   ├── giam-sat-nkbv/            # Module giám sát NKBV
│   │   ├── cssd-erp/                 # Module CSSD (chính)
│   │   ├── cssd-su-co/               # Module sự cố CSSD
│   │   ├── quan-ly-cong-viec/        # Module quản lý công việc
│   │   └── quan-tri-he-thong/        # Module quản trị
│   │       ├── danh-muc/             # CRUD danh mục master data
│   │       ├── nhan-su/              # Quản lý nhân sự
│   │       ├── bang-kiem/            # Quản lý bảng kiểm
│   │       ├── phan-quyen/           # Ma trận phân quyền
│   │       └── tai-khoan-nhan-su/    # Gán tài khoản cho nhân sự
│   │
│   ├── lib/                          # Shared logic & infrastructure
│   │   ├── supabase.ts               # Browser Supabase client (SSR cookie)
│   │   ├── supabase-server.ts        # Server clients (user / anon / admin)
│   │   ├── server-permission.ts      # verifyPermission / verifyPermissions
│   │   ├── permission-registry.ts    # SSOT module & permission definitions
│   │   ├── permission-registry-data.ts
│   │   ├── supervision-policy.ts     # Quy tắc xác định hình thức giám sát
│   │   ├── bv103-layout-chrome.ts    # SSOT CSS class cho layout
│   │   ├── cssd-routes.ts            # SSOT route CSSD
│   │   ├── cssd-component-modules.ts # 8 bounded context CSSD
│   │   ├── app-shell-scope.ts        # Shell layout scope
│   │   └── nav/ksnk-nav-gates.ts     # Sidebar permission gates
│   │
│   ├── components/                   # Shared UI components
│   │   ├── ui/                       # Primitives (Button, Dialog, Tabs...)
│   │   ├── shared/                   # ClientLayoutWrapper, OfflineSyncManager...
│   │   ├── charts/                   # Chart wrappers (Recharts)
│   │   └── auth/                     # Auth-related components
│   │
│   ├── hooks/                        # Shared React hooks
│   ├── types/                        # Shared TypeScript types
│   ├── utils/                        # Utilities
│   └── proxy.ts                      # Next.js proxy (thay middleware.ts)
│
├── supabase/
│   └── migrations/                   # 98+ file SQL migration (đếm theo thư mục; SSOT = repo)
│
├── scripts/                          # DevOps & verification scripts
├── docs/specs/                       # Tài liệu spec & working agreements
├── public/                           # Static assets (logo, PWA manifest)
└── package.json
```

### 3.1 Cấu trúc chuẩn mỗi Module

```
src/modules/<tên-module>/
├── actions/           # Server Actions (Next.js "use server")
│   ├── *-read.actions.ts    # Đọc dữ liệu
│   ├── *-write.actions.ts   # Ghi dữ liệu
│   └── index.ts             # Re-export
├── components/        # React components riêng module
├── views/             # Page-level views (được import từ app/ pages)
├── hooks/             # React hooks riêng module
├── lib/               # Business logic thuần (testable, không gọi DB)
├── types/             # TypeScript interfaces & types (contract)
│   └── index.ts
└── data/              # Dữ liệu tĩnh / constants
```

---

## 4. KIẾN TRÚC TỔNG QUAN

### 4.1 Luồng dữ liệu chính

```
Browser (React Client) 
    → Server Action (Next.js "use server")
        → verifyPermission (kiểm tra quyền)
        → Supabase Client (admin / user)
            → PostgreSQL (Supabase hosted)
    ← Response (JSON)
← React re-render
```

> **Quan trọng:** Hệ thống KHÔNG dùng REST API. Toàn bộ giao tiếp client-server qua **Next.js Server Actions**.

### 4.2 3 loại Supabase Client

| Client | File | Mục đích |
|--------|------|----------|
| **Browser Client** | `src/lib/supabase.ts` | Client-side, lưu session vào cookie qua `createBrowserClient` |
| **Server User Client** | `src/lib/supabase-server.ts` → `createServerSupabaseUserClient()` | Server-side, đọc session từ cookie — dùng cho `auth.getSession()` |
| **Admin Client** | `src/lib/supabase-server.ts` → `createAdminSupabaseClient()` | Server-side, dùng `service_role` key — bypass RLS. **Chỉ dùng sau khi đã verify quyền** |

### 4.3 Proxy (thay Middleware)

File `src/proxy.ts` (Next 16 dùng proxy thay middleware):
- Làm mới cookie session Supabase trên mọi request
- Redirect người chưa đăng nhập về `/login`
- Redirect người đã đăng nhập khỏi `/login`
- Chặn route ngoài phạm vi pilot (nếu bật `KSNK_PILOT_FOUR_MODULES=1`)

---

## 5. HỆ THỐNG XÁC THỰC & PHÂN QUYỀN

### 5.1 Xác thực (Authentication)

- **Provider:** Supabase Auth (email + password)
- **Luồng đăng nhập:** Nhập mã nhân viên hoặc email → tìm `mdm_nhan_su.auth_user_id` → xác thực Supabase Auth
- **Quên mật khẩu:** Qua email reset (Supabase built-in)
- **Session:** Cookie-based (SSR-compatible qua `@supabase/ssr`)

### 5.2 Phân quyền (Authorization) — RBAC

#### Mô hình quan hệ

```
auth.users (Supabase Auth)
    ↓ (1:N qua rel_user_roles.user_id)
rel_user_roles
    ↓ (N:1 qua role_id)
dm_roles (ADMIN, CAN_BO_KSNK, NHAN_VIEN_KHOA...)
    ↓ (1:N qua rel_role_permissions.role_id)
rel_role_permissions
    ↓ (N:1 qua permission_id)
dm_permissions (MODULE_ACTION, ví dụ: GIAM_SAT_VST_VIEW)
```

#### View tổng hợp quyền

`v_auth_user_permissions`: view join tất cả bảng trên, trả `{ auth_user_id, roles[], permissions[] }` — được đọc bởi `server-permission.ts`.

#### Module Registry (SSOT)

Tất cả module & quyền khai báo tại `src/lib/permission-registry-data.ts`:

| Module Code | Display Name | Actions |
|-------------|-------------|---------|
| `DASHBOARD` | Command Center — quyền tổng | VIEW |
| `DASHBOARD_CC_OVERVIEW` | CC — Tab Cơ cấu nguồn | VIEW |
| `DASHBOARD_CC_SUPERVISION` | CC — Tab Chuyên trách/Chéo/Tự GS | VIEW |
| `DASHBOARD_CC_GAP` | CC — Tab Đối soát & Lệch | VIEW |
| `DASHBOARD_CC_EXPORT` | CC — Xuất/in báo cáo PDF | EXPORT |
| `DANH_MUC` | Quản trị Danh mục | VIEW, CREATE, EDIT, DELETE, IMPORT |
| `NHAN_SU` | Quản lý Nhân sự | VIEW, CREATE, EDIT, DELETE, IMPORT |
| `BANG_KIEM` | Danh mục Bảng kiểm | VIEW, CREATE, EDIT, DELETE, IMPORT |
| `CONG_VIEC` | Quản lý Công việc | VIEW, CREATE, EDIT, DELETE, IMPORT, APPROVE |
| `LOAI_DC` | DM Loại dụng cụ | VIEW, CREATE, EDIT, DELETE, IMPORT |
| `BO_DC` | DM Bộ dụng cụ | VIEW, CREATE, EDIT, DELETE, IMPORT |
| `DC_LE` | DM Dụng cụ chi tiết | VIEW, CREATE, EDIT, DELETE, IMPORT |
| `THIET_BI` | DM Thiết bị | VIEW, CREATE, EDIT, DELETE, IMPORT |
| `HOA_CHAT` | DM Hóa chất | VIEW, CREATE, EDIT, DELETE, IMPORT |
| `KHOA_PHONG` | DM Khoa phòng | VIEW, CREATE, EDIT, DELETE, IMPORT |
| `BANG_KIEM_DETAIL` | Tiêu chí Bảng kiểm | VIEW, CREATE, EDIT, DELETE, IMPORT |
| `CSSD_REPORT` | CSSD — Báo cáo | VIEW, EXPORT |
| `CSSD_KHO_DUNGCU` | CSSD — Kho Dụng cụ | VIEW, CREATE, EDIT, DELETE, IMPORT |
| `CSSD_WORKFLOW` | CSSD — Quy trình QR | VIEW, CREATE, EDIT, DELETE |
| `CSSD_ME_TIET_KHUAN` | CSSD — Mẻ Tiệt khuẩn | VIEW, CREATE, EDIT, DELETE, IMPORT, QC, LOCK |
| `KSNK_KHO_HOACHAT` | KSNK — Kho hóa chất | VIEW, CREATE, EDIT, EXPORT |
| `GIAM_SAT_VST` | Giám sát Vệ sinh tay | VIEW, CREATE, EDIT, DELETE, IMPORT |
| `GIAM_SAT_CHUNG` | Giám sát Bảng kiểm chung | VIEW, CREATE, EDIT, DELETE, IMPORT |
| `GIAM_SAT_NKBV` | Giám sát NKBV/HAI | VIEW, CREATE, EDIT, DELETE, IMPORT |
| `PHAN_QUYEN` | Quản trị Phân quyền | VIEW, CREATE, EDIT, DELETE |
| `BAO_SU_CO` | Báo cáo Sự cố | VIEW, CREATE |

#### Cách verify quyền trong Server Action

```typescript
// Ví dụ trong một Server Action
"use server";
import { verifyPermission } from "@/lib/server-permission";

export async function saveVSTSession(data: VstInput) {
  await verifyPermission("GIAM_SAT_VST", "CREATE"); // Throw nếu không có quyền
  // ... logic ghi dữ liệu
}
```

#### Trusted Admin bypass

Một danh sách email admin cứng (`ADMIN_EMAILS` trong `src/lib/constants.ts`) được bypass mọi kiểm tra quyền — dùng cho vận hành ban đầu.

#### Navigation Gates (Sidebar)

File `src/lib/nav/ksnk-nav-gates.ts` định nghĩa quyền VIEW cần thiết để hiển thị mỗi mục menu. Sidebar chỉ hiện mục khi user là admin hoặc có view quyền tương ứng.

---

## 6. QUY ƯỚC ĐẶT TÊN DATABASE

### 6.1 Tiền tố bảng

| Tiền tố | Ý nghĩa | Ví dụ |
|---------|---------|-------|
| `dm_*` | Danh mục (dimension/master data) | `dm_khoa_phong`, `dm_nghe_nghiep` |
| `mdm_*` | Master Data Management | `mdm_nhan_su`, `mdm_field_registry` |
| `fact_*` | Bảng nghiệp vụ (fact/transaction) | `fact_giam_sat_vst`, `fact_cong_viec` |
| `rel_*` | Bảng quan hệ N:N | `rel_user_roles`, `rel_role_permissions` |
| `v_*` | View đọc (join sẵn các bảng) | `v_fact_giam_sat_vst_sessions_full` |

### 6.2 Quy ước cột

| Pattern | Ý nghĩa |
|---------|---------|
| `*_id` | Foreign key (UUID) |
| `ma_*` | Mã (code) |
| `ten_*` | Tên hiển thị |
| `is_active` | Soft delete flag |
| `created_at` | Thời điểm tạo |
| `updated_at` | Thời điểm cập nhật cuối |

### 6.3 Soft Delete

Hệ thống ưu tiên **soft delete** (`is_active = false`) thay vì xóa cứng. Tất cả query đọc phải lọc `is_active = true`.

---

## 7. Tài liệu rà soát định kỳ

- [`docs/reviews/KSNK_BV103_EXTERNAL_TEAM_REVIEW_BRIEF.md`](../reviews/KSNK_BV103_EXTERNAL_TEAM_REVIEW_BRIEF.md) — **bản giao cho nhóm dev bên ngoài** (checklist, CI, lint, rủi ro).  
- [`docs/reviews/KSNK_BV103_RASOAT_TONG_THE_2026-05-18.md`](../reviews/KSNK_BV103_RASOAT_TONG_THE_2026-05-18.md) — báo cáo rà soát tổng thể.  
- [`docs/reviews/README.md`](../reviews/README.md) — mục lục thư mục reviews.
