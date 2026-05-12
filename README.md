# KSNK BV103

Ứng dụng [Next.js](https://nextjs.org) cho hệ thống Kiểm soát nhiễm khuẩn BV103.

## Chạy thử local (lần đầu)

1. Cài dependency: `npm ci` (hoặc `npm install`).
2. Tạo project trên [Supabase](https://supabase.com), lấy **Project URL**, **anon public**, **service_role** tại *Settings → API*.
3. `npm run env:bootstrap` tạo `.env.local` từ `.env.example`, điền ba biến Supabase, rồi `npm run env:check`.
4. Áp schema DB: cài [Supabase CLI](https://supabase.com/docs/guides/cli), chạy `supabase link` (project remote) hoặc `supabase start` (Postgres local), sau đó:
   - Remote: `npm run mdm:migrate`
   - Local stack: `npm run mdm:migrate:local`  
   Hoặc một lượt migrate + postcheck: `npm run mdm:apply-and-verify` / `npm run mdm:apply-and-verify:local`.
5. Kiểm tra nhanh 4 module (bảng + RPC dashboard/GSC/VST): `npm run trial:db:precheck` (remote) hoặc `npm run trial:db:precheck:local`. Mọi cột `*_ok` phải là `t`.
6. `npm run dev` — mở [http://localhost:3000](http://localhost:3000), đăng nhập tài khoản đã gán quyền RBAC (và seed MDM tối thiểu: khoa phòng, nhân sự, v.v.).

**Gọn dữ liệu SQL:** schema chuẩn chỉ nằm trong `supabase/migrations/` (đừng apply file SQL ghép thủ công). Bản SQL kiểm tra pilot nằm ở `scripts/sql/trial-four-modules-precheck.sql`.

Gộp bước 3 khi đã có `.env.local`: `npm run trial:prep`.  
Sau khi đã `supabase link`: **`npm run pilot:ship`** = kiểm tra env + gate + build + migrate + precheck 4 module.

## Getting Started (dev)

```bash
npm run dev
```

Chỉnh sửa `src/app/page.tsx` và các route trong `src/app/` — trang cập nhật khi lưu file.

## Tài liệu nội bộ

- [`AGENTS.md`](./AGENTS.md) — chuẩn làm việc và kiểm tra chất lượng.
- [`docs/specs/working/LEAN_EXECUTION_BV103.md`](./docs/specs/working/LEAN_EXECUTION_BV103.md) — checklist thực thi.
- [`docs/specs/working/DEPLOY_FOUR_MODULES_BV103.md`](./docs/specs/working/DEPLOY_FOUR_MODULES_BV103.md) — **hướng dẫn deploy pilot từng bước** (Quản trị, GSC, VST, Dashboard).

## Deploy (Vercel / hosting)

Xem [Next.js — Deploying](https://nextjs.org/docs/app/building-your-application/deploying). Trên hosting, cấu hình cùng các biến như `.env.example` (URL + anon + service role); **không** đưa service role lên client — chỉ biến `NEXT_PUBLIC_*` và secrets server-side theo tài liệu nhà cung cấp.
