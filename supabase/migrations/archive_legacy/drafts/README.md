# Migration DRAFT (không apply)

File `*_DRAFT*.sql` **không** nằm trong thư mục apply (`supabase/migrations/*.sql`).
CLI Supabase chỉ quét file trực tiếp ở thư mục gốc migrations — subfolder này **không** chạy khi `db push` / `mdm:migrate`.

| File | Mục đích | Apply khi nào |
|------|----------|---------------|
| `20260905120000_cssd_fact_quy_trinh_thanh_phan_write_rls_DRAFT.sql` | Write RLS defense-in-depth cho bảng legacy `cssd_fact_quy_trinh_thanh_phan` (đã DROP lean hub) | Chỉ khi PO duyệt + gate ops-go-live §7; copy lại thư mục gốc rồi migrate |

ADR: [`docs/core/adr-cssd-fact-write-rls.md`](../../../../docs/core/adr-cssd-fact-write-rls.md).

**MIG-DRAFT-01** (audit 2026-09-15): tránh `db push` chạy nhầm file DRAFT.
