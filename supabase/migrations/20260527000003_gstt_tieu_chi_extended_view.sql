-- Migration: Slice 3 (giam-sat-tuan-thu reform v4) — Mở rộng tieu_chi_jsonb schema.
-- Date: 27/05/2026
--
-- Mục tiêu:
--   * Mở rộng JSONB schema của `gstt_dm_bang_kiem.tieu_chi_jsonb` thêm 6 key Việt
--     hóa theo Dim_Checklist_Item của tài liệu JCI 8.0:
--       - phan_muc       (section_name) — A/B/C, WHO Surgical 3-phase
--       - kieu_du_lieu   (data_type)    — BOOLEAN | LUA_CHON | SO_LIEU
--       - la_then_chot   (is_critical)  — dùng cho cach_tinh_diem='TRON_GOI'
--       - cho_phep_kpa   (allow_na)     — Không phù hợp/áp dụng
--       - cac_lua_chon   (enum_options) — array khi kieu_du_lieu='LUA_CHON'
--       - ma_csv_goc     (legacy_code)  — Item_ID 1001..6004 traceability
--   * Recreate VIEW `gstt_dm_tieu_chi_bang_kiem` để surface 6 key này — backward
--     compat: tiêu chí cũ thiếu key vẫn parse được (default ở DB layer + Zod).
--   * KHÔNG đụng `tieu_chi_jsonb` raw data ở các row hiện hữu — chỉ extend reader.
--
-- Lưu ý dependency:
--   * `v_dm_tieu_chi_bang_kiem_full` SELECT từ view này → cần DROP CASCADE rồi
--     recreate đầy đủ.
--   * `dm_tieu_chi_bang_kiem` (legacy compat `SELECT * FROM gstt_*`) cũng phải
--     recreate để pickup cột mới.

-- ----------------------------------------------------
-- 1. Drop dependent views (sẽ recreate ngay sau)
-- ----------------------------------------------------
DROP VIEW IF EXISTS public.v_dm_tieu_chi_bang_kiem_full CASCADE;
DROP VIEW IF EXISTS public.dm_tieu_chi_bang_kiem CASCADE;
DROP VIEW IF EXISTS public.gstt_dm_tieu_chi_bang_kiem CASCADE;

-- ----------------------------------------------------
-- 2. Recreate `gstt_dm_tieu_chi_bang_kiem` với 6 key mới
--    Cố ý giữ nguyên thứ tự cột cũ (id, ma_tc, bang_kiem_id, stt, noi_dung,
--    ghi_chu, is_active, created_at, updated_at, diem_toi_da) để không phá
--    ORDER BY trong code hiện hữu, append 6 cột mới ở cuối.
-- ----------------------------------------------------
CREATE OR REPLACE VIEW public.gstt_dm_tieu_chi_bang_kiem
  WITH (security_invoker = 'true')
AS
SELECT
  (r.elem->>'id')::uuid                                                AS id,
  r.elem->>'ma_tc'                                                     AS ma_tc,
  s.id                                                                 AS bang_kiem_id,
  (r.elem->>'stt')::int                                                AS stt,
  r.elem->>'noi_dung'                                                  AS noi_dung,
  r.elem->>'ghi_chu'                                                   AS ghi_chu,
  COALESCE((r.elem->>'is_active')::boolean, true)                      AS is_active,
  COALESCE((r.elem->>'created_at')::timestamptz, s.created_at)         AS created_at,
  COALESCE((r.elem->>'updated_at')::timestamptz, s.updated_at)         AS updated_at,
  COALESCE((r.elem->>'diem_toi_da')::int, 1)                           AS diem_toi_da,
  -- 6 key mới (Slice 3)
  r.elem->>'phan_muc'                                                  AS phan_muc,
  COALESCE(NULLIF(r.elem->>'kieu_du_lieu', ''), 'BOOLEAN')              AS kieu_du_lieu,
  COALESCE((r.elem->>'la_then_chot')::boolean, false)                   AS la_then_chot,
  COALESCE((r.elem->>'cho_phep_kpa')::boolean, true)                    AS cho_phep_kpa,
  CASE
    WHEN jsonb_typeof(r.elem->'cac_lua_chon') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(r.elem->'cac_lua_chon'))
    ELSE NULL
  END                                                                   AS cac_lua_chon,
  r.elem->>'ma_csv_goc'                                                 AS ma_csv_goc
FROM public.gstt_dm_bang_kiem s,
     LATERAL jsonb_array_elements(s.tieu_chi_jsonb) r(elem);

COMMENT ON VIEW public.gstt_dm_tieu_chi_bang_kiem IS
  'Unpack tieu_chi_jsonb thành rows phẳng để app SELECT. Slice 3 (reform v4): thêm 6 key phan_muc/kieu_du_lieu/la_then_chot/cho_phep_kpa/cac_lua_chon/ma_csv_goc với default backward-compat.';

-- ----------------------------------------------------
-- 3. Recreate legacy compat view `dm_tieu_chi_bang_kiem` (SELECT *)
-- ----------------------------------------------------
CREATE OR REPLACE VIEW public.dm_tieu_chi_bang_kiem
  WITH (security_invoker = 'true')
AS
SELECT * FROM public.gstt_dm_tieu_chi_bang_kiem;

-- ----------------------------------------------------
-- 4. Recreate `v_dm_tieu_chi_bang_kiem_full` — kéo 6 key mới
-- ----------------------------------------------------
CREATE OR REPLACE VIEW public.v_dm_tieu_chi_bang_kiem_full
  WITH (security_invoker = 'true')
AS
SELECT
  tc.id,
  tc.bang_kiem_id,
  bk.ma_bk            AS ma_bang_kiem,
  bk.ten_bang_kiem,
  tc.noi_dung,
  tc.stt,
  tc.diem_toi_da,
  tc.is_active,
  tc.created_at,
  tc.updated_at,
  -- 6 key mới (Slice 3)
  tc.phan_muc,
  tc.kieu_du_lieu,
  tc.la_then_chot,
  tc.cho_phep_kpa,
  tc.cac_lua_chon,
  tc.ma_csv_goc
FROM public.gstt_dm_tieu_chi_bang_kiem tc
LEFT JOIN public.gstt_dm_bang_kiem bk ON bk.id = tc.bang_kiem_id;
