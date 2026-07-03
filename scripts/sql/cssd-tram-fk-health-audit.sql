-- CSSD: kiểm tra SSOT trạm (cssd_dm_tram + cssd_fact_quy_trinh.tram_hien_tai_id)
-- Single-statement JSON for supabase db query runner.

SELECT jsonb_build_object(
  'tram_rows', (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object('ma_tram', ma_tram, 'ten_tram', ten_tram, 'thu_tu', thu_tu, 'is_active', is_active)
      ORDER BY thu_tu
    ), '[]'::jsonb)
    FROM public.cssd_dm_tram
  ),
  'quy_trinh_thieu_tram', (
    SELECT count(*)::int
    FROM public.cssd_fact_quy_trinh
    WHERE is_active = true AND tram_hien_tai_id IS NULL
  ),
  'quy_trinh_tram_invalid', (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object('id', q.id, 'ma_qr_quy_trinh', q.ma_qr_quy_trinh, 'tram_hien_tai_id', q.tram_hien_tai_id)
    ), '[]'::jsonb)
    FROM public.cssd_fact_quy_trinh q
    LEFT JOIN public.cssd_dm_tram t ON t.id = q.tram_hien_tai_id
    WHERE q.is_active = true AND (q.tram_hien_tai_id IS NULL OR t.id IS NULL)
  ),
  'sample_active_quy_trinh', (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'ma_qr_quy_trinh', ma_qr_quy_trinh,
        'ma_trang_thai_hien_tai', ma_trang_thai_hien_tai,
        'ten_tram_hien_tai', ten_tram_hien_tai,
        'is_dong_bang', is_dong_bang
      )
    ), '[]'::jsonb)
    FROM (
      SELECT ma_qr_quy_trinh, ma_trang_thai_hien_tai, ten_tram_hien_tai, is_dong_bang
      FROM public.v_cssd_quy_trinh_full
      WHERE is_active = true
      ORDER BY updated_at DESC NULLS LAST
      LIMIT 20
    ) s
  ),
  'quy_trinh_qua_han_fefo', (
    SELECT count(*)::int
    FROM public.v_cssd_quy_trinh_full
    WHERE is_active = true
      AND ngay_het_han IS NOT NULL
      AND ngay_het_han < CURRENT_DATE
  )
) AS cssd_tram_fk_health;
