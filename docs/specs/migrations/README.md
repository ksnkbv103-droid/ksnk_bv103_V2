# Migrations (spec)

**SSOT schema:** `supabase/migrations/` — chỉ dùng `supabase db push` / `npm run mdm:migrate` (hoặc bản `:local`).

Thư mục này **không** chứa bản SQL song song để apply tay; các file trùng lặp đã gỡ để tránh lệch với chuỗi migration thật.
