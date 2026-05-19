# Pre-P0 — Gói contract tối thiểu (index)

Cap nhat: 02/05/2026

File nay dap ung muc **exit criteria Pre-P0**: “Co file contract du lieu toi thieu (export, rbac, red flag, checklist scope)” — lien ket cac tai lieu chi tiet san co va diem neo trong code.

## 1) Xuat lieu VST (SPSS/Stata / flat Excel)

| Tai lieu | Noi dung |
|----------|----------|
| `docs/specs/working/EXPORT_CONTRACT_VST.md` | Cot dau ra, WHO 5 moments nhi phan, rule 1 co hoi = 1 row, gioi han toi da 2 chi dinh/co hoi |
| [`../legacy-only/DATA_FLATTEN_REFERENCE.md`](../legacy-only/DATA_FLATTEN_REFERENCE.md) | Thuat toan flatten & constraint goc (WHO), legacy |
| Code thuc thi flatten | Modules `giam-sat-vst`, hook `src/hooks/useExportSPSS.ts`, component Export SPSS o Giam sat VST/Chung |

**Quy tac:** moi thay doi cot xuat bat buoc dong bo `EXPORT_CONTRACT_VST.md` + kiem tra import trong code xuat.

## 2) RBAC — pham vi & ma module

| Nguon | Ghi chu |
|-------|---------|
| `src/lib/permission-registry.ts` | SSOT: `MODULE_REGISTRY`, `getFlatPermissions()` dong bo DB/UI |
| `src/lib/server-permission.ts` | `verifyPermission(moduleKey, action)` — action dang lowercase (`view`, `create`, `edit`, …) |
| `src/modules/quan-tri-he-thong/danh-muc/actions/master-table-permission-map.ts` | Bang Postgres master -> ma module (`import` / `view`) cho excel |
| Modules quan tri | Mot so action ding `quan-tri-he-thong/actions/verify-permission.ts` — can thong nhat dan ve `server-permission` theo tien do refactor |

Tham chieu bang audit ghi/nghe tai `docs/specs/../PREP0_UI_ACTION_DB_MATRIX.md` (muc “Quyen server action”).

## 3) Red flag / ma loi nghiem trong

| Tai lieu | Noi dung |
|----------|----------|
| `docs/specs/working/RED_FLAG_DICTIONARY.md` | Bang ma ERR_* uu tien, rule trigger (`is_red_flag` + ket qua KHONG DAT), payload webhook |

**Luu y:** Logic UI/CSSD checklist can dich dan theo dictionary; tranh ma loi string rac trong component.

## 4) Dynamic checklist (Giam sat chung / bang kiem)

| Thuc the DB | Vai tro |
|-------------|---------|
| `danh_muc_bang_kiem` | Mau bang kiem (`ma_bk`, `ten_bk`) |
| `tieu_chi_bang_kiem` | Tieu chi, `noi_dung`, `stt`, lien ket bang kiem |

Module UI: `src/modules/quan-tri-he-thong/bang-kiem/`; form GSC tai `src/modules/giam-sat-chung/` (lay tieu chi qua action bang kiem).

**Pham vi uu tien Pre-P0:** dam bao 1 bang kiem GSC tai duoc tieu chi hop le; khong tach them tinh nang ngoai baseline.

## 5) Trang thai Pha A (build / CI)

- Build production (`npm run build`) xanh; viewport tach khoi `metadata`.
- Log Supabase client: chi khi dev + `NEXT_PUBLIC_DEBUG_SUPABASE=1` (`src/lib/supabase.ts`).
- CI: `.github/workflows/ci.yml` gate `npm run build` + env placeholder.
- `npm run verify` = build; `npm run verify:full` = lint + build (lint con no du an).

## 6) Mau thuan tai lieu

Khi lệch nhau: `AGENTS.md` **V7** > `.cursor/rules/*.mdc` > `PROGRESS_REPORT.md` > `docs/specs/*` (bắt đầu `../README.md`, `READ_MINIMUM_BY_CHANGE.md`) > [`SKILLS_CATALOG.md`](../SKILLS_CATALOG.md) / skill (chỉ hỗ trợ kỹ thuật) > [`legacy-only/DATA_FLATTEN_REFERENCE.md`](../legacy-only/DATA_FLATTEN_REFERENCE.md).

## 7) Thu nghiem UI tren localhost (sau gate quyen moi)

1. **Cài & env:** trong thu muc goc repo chay `npm install`. Sao chep `.env.example` → `.env.local`, dien `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, va `SUPABASE_SERVICE_ROLE_KEY` (tu Supabase Dashboard).
2. **Chay app:** `npm run dev` roi mo **http://localhost:3000** (Next.js mac dinh — xem dong lenh trong terminal neu khac port).
3. **Dang nhap:** vao **`/login`**, tai khoan phai tan tai trong Supabase Auth.
4. **Quyen va thu man hinh:**
   - **Cach A (nhanh):** tai khoan dung **email trong** `ADMIN_EMAILS` tai `src/lib/constants.ts` — `verifyPermission` bo qua check chi tiet module (thi het danh muc / import / luong gated).
   - **Cach B:** trong bang `user_roles`, gan user **role ten `ADMIN`**; chay dong bo tai **Quan tri → Phan quyen** (“Dong bo registry”) de day `permissions` + day du quyen cho ADMIN (chi user da co quyen vao RBAC).
   - **Cach C:** vai tro tuy bien: gan dung tu cap `*_view`, `*_import`, … theo bang ma tran trong `permission-registry.ts`.
5. **Ngo le:** neu action bao khong du quyen, kiem tra `user_roles`, `roles`, va `role_permissions` join den `permissions` (cap `module_name` + `action` chu thuong: `view`, `import`, ...).

**Giai thich ngan:** Email/vai ADMIN trong code la tam “co lenh” cho nguoi vận hanh ky thuat; nguoi dung thường dung vai duoc gan quyen tung module.
