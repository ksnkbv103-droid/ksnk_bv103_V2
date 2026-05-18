sau đó# Triển khai pilot — 4 module (Quản trị, Giám sát chung, VST, Dashboard)

Tài liệu từng bước: **làm xong một mục, kiểm tra dấu ✓ rồi sang bước sau**. Phạm vi: **Quản trị hệ thống** (MDM + nhân sự + bảng kiểm + phân quyền), **Giám sát KSNK chung (GSC)**, **Giám sát vệ sinh tay (VST)**, **Dashboard tuân thủ** (trang chủ app). Không bao gồm CSSD / NKBV / Công việc.

**Tham chiếu thêm:** [`VANHANH_AUTH_RBAC_KSNK.md`](./VANHANH_AUTH_RBAC_KSNK.md), [`AGENTS.md`](../../../AGENTS.md), [`README.md`](../../../README.md).

---

## Phần A — Chuẩn bị máy và tài khoản

### A0. Tài khoản & quyền truy cập (trước khi cài phần mềm)

| Việc | Kiểm tra ✓ |
|------|-------------|
| **Tài khoản Supabase** (đăng ký miễn phí hoặc org BV) — dùng tạo project ở Phần B | Đăng nhập được [dashboard](https://supabase.com/dashboard) |
| **Quyền clone repo** mã nguồn BV103 (HTTPS/SSH + PAT nếu repo private) | `git ls-remote <URL>` không báo lỗi xác thực |
| **Trình duyệt** để thử UI (Chrome / Edge / Firefox bản mới) | Mở được `http://localhost:3000` sau bước dev |

✓ Xong **A0** → **A1**.

### A1. Công cụ cài trên máy

| Công cụ | Kiểm tra | Ghi chú |
|--------|----------|---------|
| **Node.js ≥ 20** (khuyến nghị LTS, ví dụ 20.x / 22.x) | `node -v` | Next 16 + `@types/node` ^20; bản cũ hơn 18 dễ lỗi build |
| **npm** (đi kèm Node) | `npm -v` | Repo dùng `npm`; không bắt buộc pnpm/yarn cho pilot này |
| **Git** | `git --version` | Clone và cập nhật repo |
| **Supabase CLI** | `npx supabase --version` (từ thư mục repo sau `npm ci`) | Đã ghim **`supabase`** trong `devDependencies`; mọi script npm (`mdm:migrate`, `trial:db:precheck`, …) gọi **`npx supabase`** — **không** cần cài CLI global |
| **Docker Desktop** (hoặc Docker Engine) | `docker --version` | **Chỉ cần** nếu bạn dùng DB local `npx supabase start`. Pilot **chỉ Supabase Cloud** + `supabase link` → **bỏ qua** Docker |

**Mạng:** `npm ci`, `npx supabase login`, tải image Docker (nếu dùng) cần internet ổn định.

✓ Đủ hàng bắt buộc cho lộ trình bạn chọn (cloud-only *hoặc* cloud + Docker local) → **A2**.

### A2. Clone và cài dependency

```bash
git clone <URL-repo-ksnk_bv103>.git
cd ksnk_bv103
npm ci
```

- **`npm ci`** bắt buộc có file **`package-lock.json`** trong repo (BV103 đã có). Nếu bản clone lạc lõng không còn lock, dùng một lần `npm install` rồi không xóa `package-lock.json`.
- Máy **Windows:** nên dùng **Git Bash** hoặc **PowerShell** chạy lệnh trên; WSL2 cũng ổn.

✓ `npm ci` kết thúc không lỗi → sang **Phần B**.

---

## Phần B — Project Supabase (database + Auth)

### B1. Tạo project

1. Đăng nhập [Supabase Dashboard](https://supabase.com/dashboard).
2. **New project** → chọn org, đặt tên, mật khẩu database, region.
3. Đợi project **Healthy** (vài phút).

✓ Project tạo xong → **B2**.

### B2. Lấy API keys (bí mật, không đăng công khai)

1. Vào project → **Settings** → **API**.
2. Ghi lại (chỉ lưu chỗ an toàn):
   - **Project URL** → dùng cho `NEXT_PUBLIC_SUPABASE_URL`
   - **`anon` `public`** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **`service_role` `secret`** → `SUPABASE_SERVICE_ROLE_KEY` (chỉ server / CI, không bao giờ đưa vào bundle client)

✓ Đã copy đủ 3 giá trị → **B3**.

### B3. Auth — URL site (khuyến nghị trước khi có domain thật)

1. **Settings** → **Authentication** → **URL configuration**.
2. **Site URL:** với pilot local: `http://localhost:3000`; production: `https://<domain-của-bạn>`.
3. **Redirect URLs:** thêm ít nhất:
   - `http://localhost:3000/**`
   - `https://<domain-của-bạn>/**` (khi đã có SSL)
   - (tuỳ chọn) `http://localhost:3000/login/reset-password`

✓ Đã cấu hình URL → **Phần C**.

---

## Phần C — Biến môi trường ứng dụng Next.js

### C1. Tạo `.env.local`

Trên máy dev (hoặc secrets trên hosting):

```bash
npm run env:bootstrap
```

Nếu đã có `.env.local`, bước này bỏ qua (script không ghi đè).

### C2. Điền giá trị thật

Mở `.env.local`, đặt:

- `NEXT_PUBLIC_SUPABASE_URL` = Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon key
- `SUPABASE_SERVICE_ROLE_KEY` = service_role key

Tuỳ chọn (khuyến nghị khi dùng quên mật khẩu / link email):

- `NEXT_PUBLIC_SITE_URL` = cùng origin người dùng truy cập (vd. `http://localhost:3000` hoặc `https://...`)

### C3. Kiểm tra

```bash
npm run env:check
```

✓ In ra `[env:check] OK` → sang **Phần D**.  
✗ Báo thiếu biến hoặc placeholder → sửa `.env.local` rồi chạy lại `env:check`.

---

## Phần D — Áp schema database (migrations)

Chỉ dùng chuỗi trong **`supabase/migrations/`** qua CLI — **không** chạy tay file SQL ghép ngoài repo.

### D1. Đăng nhập Supabase CLI

```bash
npx supabase login
```

Làm theo trình duyệt để xác thực.

✓ Login thành công → **D2**.

### D2. Liên kết project (remote — pilot trên cloud)

Trong thư mục repo:

```bash
npx supabase link --project-ref <PROJECT_REF>
```

`PROJECT_REF` lấy từ URL Dashboard: `https://supabase.com/dashboard/project/<ref>`.

✓ `link` thành công → **D3**.

**Tuỳ chọn local-only:** nếu chỉ thử Postgres trên máy, dùng `npx supabase start` rồi các lệnh bên dưới thay `--linked` bằng `--local` / dùng script `*:local` trong `package.json`.

### D3. Đẩy migration

```bash
npm run mdm:migrate
```

(Hoặc `npm run mdm:apply-and-verify` nếu muốn một lượt migrate + postcheck SQL có sẵn trong repo.)

✓ Lệnh kết thúc không lỗi → **D4**.

### D4. Precheck 4 module (bảng + RPC bắt buộc)

```bash
npm run trial:db:precheck
```

Mở kết quả: **mọi cột `*_ok` phải là `t`**.

| Nếu fail | Hướng xử lý ngắn |
|----------|------------------|
| `unaccent_ext_ok` = f | Bật extension `unaccent` trên DB (migration repo thường đã có; nếu DB cũ tự tạo, cần `CREATE EXTENSION IF NOT EXISTS unaccent;` trong migration mới — hỏi đầu mối DB) |
| `rpc_*_ok` = f | Migration chưa chạy đủ hoặc DB lệch; chạy lại `mdm:migrate` và xem log |

✓ Precheck toàn `t` → **Phần E**.

---

## Phần E — Quyền RBAC tối thiểu cho 4 module

Ứng dụng đọc quyền từ view (vd. `v_auth_user_permissions`) sau khi gán vai trò. Chi tiết vận hành: [`VANHANH_AUTH_RBAC_KSNK.md`](./VANHANH_AUTH_RBAC_KSNK.md).

### E1. Tài khoản đầu tiên (Auth + nhân sự)

1. **Supabase Dashboard** → **Authentication** → **Users** → **Add user** (email + mật khẩu) **hoặc** đăng ký qua app nếu đã bật.
2. Đảm bảo có dòng **`mdm_nhan_su`** trùng **email** (migration seed có thể đã tạo profile mẫu cho email admin test — xem `supabase/migrations/20260707010_seed_test_admin_profile.sql`; production nên thay bằng email thật của bệnh viện).

✓ User Auth tồn tại và có `mdm_nhan_su` tương ứng (hoặc sẽ tạo qua màn Tài khoản nhân sự sau khi có ADMIN) → **E2**.

### E2. Vai trò ADMIN (để vào Phân quyền / Quản trị)

Nếu migration seed đã gán `vai_tro_he_thong_ksnk` chứa `ADMIN` cho user test, user đó có bypass ma trận theo logic server (xem `server-permission.ts` + `ADMIN_EMAILS` trong `src/lib/constants.ts` nếu dùng email tin cậy).

Pilot thực tế: gán user vào vai trò **ADMIN** trong hệ RBAC (bảng/vai trò do migration định nghĩa — thường qua SQL seed hoặc màn **Phân quyền** sau lần đăng nhập đầu bằng admin).

✓ Có ít nhất một user đăng nhập được và vào được **Quản trị** → **E3**.

### E3. Ma trận quyền tối thiểu theo module

Gán cho vai trò pilot (vd. nhân viên KSNK) các quyền **view** (và **create/edit** nếu cần nhập liệu):

| Module (code) | Route / chức năng chính | Ghi chú |
|---------------|-------------------------|---------|
| **DASHBOARD** | `/` — Dashboard tuân thủ | Cần `view` |
| **GIAM_SAT_CHUNG** | `/giam-sat-chung` | Cần `view`; `create`/`edit` để nhập phiên |
| **GIAM_SAT_VST** | `/giam-sat-vst`, `/giam-sat-vst/lich-su` | Cần `view`; `create`/`edit` để nhập phiên |
| **DANH_MUC** | `/quan-tri-he-thong/danh-muc/...` | `view` tối thiểu cho hub danh mục |
| **NHAN_SU** | `/quan-tri-he-thong/nhan-su` | Quản lý hồ sơ |
| **BANG_KIEM** | `/quan-tri-he-thong/bang-kiem` | Danh mục bảng kiểm GSC |
| **KHOA_PHONG** (và các `dm_*` cần thiết) | Các trang danh mục tương ứng | Tuỳ pilot có mở tab MDM nào |
| **PHAN_QUYEN** | `/quan-tri-he-thong` (ma trận) | Chỉ admin đầu nguồn |

**Dashboard tuân thủ (server):** cần **`DASHBOARD` + `view`** **và** ít nhất một trong **`GIAM_SAT_CHUNG` + `view`** hoặc **`GIAM_SAT_VST` + `view`** — để user chỉ làm VST vẫn xem được dashboard tổng hợp.

✓ Đã gán quyền và (nếu dùng) **Đồng bộ registry** trên ma trận → **Phần F**.

---

## Phần F — Dữ liệu master tối thiểu (để form không lỗi)

Sau khi vào **Quản trị**, cần có tối thiểu:

1. **Khối / Khoa phòng** (`dm_khoi_khoa`, `dm_khoa_phong`) — phiên GSC/VST chọn khoa.
2. **Khu vực giám sát**, **Nghề nghiệp** (nếu dùng GSC đủ trường) — từ registry / danh mục tương ứng.
3. **Bảng kiểm + tiêu chí** (`dm_bang_kiem`, `dm_tieu_chi_bang_kiem`) — cho GSC và filter dashboard.
4. **Nhân sự** (`mdm_nhan_su`) — người giám sát, đối tượng quan sát.

Có thể nhập tay qua UI hoặc dùng script import có trong repo (theo quyền **IMPORT**).

✓ Tạo được một phiên GSC / VST thử trên UI (hoặc thấy filter dashboard có dữ liệu) → **Phần G**.

---

## Phần G — Chạy ứng dụng và kiểm thử từng màn

### G1. Dev local

```bash
npm run dev
```

Mở `http://localhost:3000` → đăng nhập.

### G2. Checklist màn (làm tới đâu chắc tới đó)

| # | Việc | Kỳ vọng ✓ |
|---|------|------------|
| 1 | Đăng nhập | Vào được, không lỗi “thiếu env” |
| 2 | Mở `/` (Dashboard) | Load filter + biểu đồ / bảng (có thể rỗng nếu chưa có phiên) |
| 3 | Mở `/giam-sat-chung` | Form / lịch sử không 500 |
| 4 | Mở `/giam-sat-vst` | Form VST không 500 |
| 5 | Mở `/quan-tri-he-thong` và một trang danh mục | Bảng MDM đọc được (RLS + quyền đúng) |
| 6 | Mở `/quan-tri-he-thong/bang-kiem` | Danh sách bảng kiểm + tiêu chí |
| 7 | Lưu một phiên GSC + một phiên VST (nếu được quyền) | Thành công, lịch sử thấy bản ghi |
| 8 | Quay lại `/` đổi khoảng ngày | Dashboard phản ánh dữ liệu (sau vài giây cache nếu có) |

✓ Hết checklist → pilot **local** coi như xong.

---

## Phần H — Deploy hosting (Vercel hoặc tương đương)

### H1. Build production trên máy (bắt buộc trước khi tin tưởng deploy)

```bash
npm run verify:engineering
npm run build
```

✓ `build` xong không lỗi → mới đẩy lên hosting.

### H2. Biến môi trường trên hosting

Thêm **cùng tên** như `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` → chỉ khai báo trong **Environment Variables** kiểu **server/secret** (Vercel: không tick “Expose to browser”).

Thêm:

- `NEXT_PUBLIC_SITE_URL` = URL production (vd. `https://app.bv103...`)

Tuỳ chọn (pilot **chỉ** 4 module — chặn `/cssd-erp`, `/giam-sat-nkbv`, `/quan-ly-cong-viec` ở tầng `proxy`):

- `KSNK_PILOT_FOUR_MODULES=1` — biến **server** (không cần `NEXT_PUBLIC_`). Trên Vercel: thêm như biến môi trường thường, **không** expose ra browser. Môi trường dev/staging **không** set → vẫn mở đủ route để phát triển các module còn lại.

### H3. Lặp lại B3 + E trên môi trường production

- Redirect URLs trong Supabase phải có domain production.
- Tạo user production, gán quyền, seed MDM tối thiểu giống pilot.

### H4. Kiểm tra sau deploy

Lặp bảng **G2** trên URL production.

---

## Phần I — Khi có sự cố (tra cứu nhanh)

| Hiện tượng | Hướng xử lý |
|------------|-------------|
| `Thiếu biến môi trường Supabase` | `npm run env:check`; hosting thiếu secret |
| `Bạn không có quyền [view] trên module [DASHBOARD]` | Gán `DASHBOARD` + `GIAM_SAT_CHUNG` hoặc `GIAM_SAT_VST` (xem Phần E3) |
| RPC / function không tồn tại | Chạy lại migration + `trial:db:precheck` |
| Đăng nhập bằng `ma_nv` không được | Cần `mdm_nhan_su.email` khớp user Auth; xem `VANHANH_AUTH_RBAC_KSNK.md` |
| Email reset không gửi | Cấu hình SMTP / template trong Supabase + `NEXT_PUBLIC_SITE_URL` |
| 404 tại `/cssd-erp` hoặc NKBV / Công việc | Đang bật `KSNK_PILOT_FOUR_MODULES=1` (pilot 4 module); bỏ biến hoặc deploy môi trường không pilot để mở lại |

---

## Phần I — Hiệu năng pilot (ôn định sau deploy)

| Việc | Ghi chú |
|------|---------|
| **Khoảng ngày mặc định** | Command Center + fallback server dùng `BV103_ANALYTICS_DEFAULT_MONTHS` ([`src/lib/bv103-analytics-default-range.ts`](../../../src/lib/bv103-analytics-default-range.ts)). Rút ngắn khoảng mặc định giảm tải RPC; nhu cầu 12 tháng → chỉnh trong bộ lọc UI. |
| **Một POST / tab** | Dashboard: overview & tab Đối soát đã gom bundle server — tránh tự thêm N lần gọi action cho cùng một màn. |
| **Session** | Next 16: [`src/proxy.ts`](../../../src/proxy.ts) làm mới cookie trước RSC — không thêm `middleware.ts` song song. |
| **Đo thật** | `npm run pilot:dashboard:explain:linked` — chạy `EXPLAIN (ANALYZE, BUFFERS)` lần lượt cho `rpc_get_dashboard_summary_table`, `rpc_get_compliance_dashboard_multi_v1` (1 mã `dm_bang_kiem` để tránh trùng temp table trong multi), `rpc_get_vst_dashboard_v2` (~6 tháng). Hoặc SQL Editor với các file trong `scripts/sql/pilot-dashboard-rpc-explain-0*.sql`. |
| **Index** | Chỉ thêm index khi `EXPLAIN (ANALYZE)` chứng minh sequential scan lớn trên `fact_*` theo cột lọc ngày/khoa — khớp [`SMART_DB_PRAGMATIC_PLAYBOOK.md`](../SMART_DB_PRAGMATIC_PLAYBOOK.md). |

---

## Tóm tắt lệnh theo thứ tự (copy-paste)

**Một lệnh gộp** (sau khi đã có `.env.local` + `supabase link` — xem Phần B/C/D):

```bash
npm ci
npm run pilot:ship
npm run dev
```

`pilot:ship` chạy tuần tự: `env:check` → `verify:engineering` → `build` → `mdm:migrate` → `trial:db:precheck`.

**Lần đầu trên máy mới** (chưa có env / chưa link):

```bash
npm ci
npm run env:bootstrap
# sửa .env.local
npm run env:check
npx supabase login
npx supabase link --project-ref <REF>
npm run pilot:ship
npm run dev
```

Trước deploy production (hosting):

```bash
npm run pilot:ship
```

---

*Cập nhật theo codebase BV103; migration SSOT: `supabase/migrations/`.*
