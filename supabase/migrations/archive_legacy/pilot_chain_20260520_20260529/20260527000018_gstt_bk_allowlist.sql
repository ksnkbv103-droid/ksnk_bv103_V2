-- Migration: gstt_dm_bang_kiem allowlist column
-- Slice 6 (session-level RCA v5): mỗi bảng kiểm tự khai allowlist reason
-- (canonical code + local description) thay vì gắn vào từng tiêu chí.
-- Date: 27/05/2026

begin;

-- ----------------------------------------------------
-- 1. Thêm cột allowlist vào gstt_dm_bang_kiem
-- ----------------------------------------------------

alter table public.gstt_dm_bang_kiem
  add column if not exists nguyen_nhan_cho_phep_jsonb jsonb not null default '[]'::jsonb;

comment on column public.gstt_dm_bang_kiem.nguyen_nhan_cho_phep_jsonb is
  'Allowlist nguyên nhân cấp BẢNG KIỂM. Mảng object:
   [{
     master_reason_id: uuid,        -- FK gstt_dm_failure_reason
     ten_hien_thi: text|null,       -- Wording sát ngữ cảnh bảng kiểm (fallback master.ten_loi_chuan)
     mo_ta_chi_tiet: text|null,     -- Mô tả chi tiết giúp giám sát viên chọn đúng
     vi_du_thuc_te: text|null,      -- Ví dụ thực tế
     thu_tu_hien_thi: int           -- Order trong UI
   }]
   Empty array → UI fallback hiển thị tất cả reason theo pham_vi_ap_dung filter.';

-- ----------------------------------------------------
-- 2. Reload PostgREST schema cache
-- ----------------------------------------------------
notify pgrst, 'reload schema';

commit;
