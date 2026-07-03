-- Sweep dữ liệu mồ côi cho các bảng fact chưa có audit riêng (QLCV / NKBV / kho hóa chất).
-- Bổ sung cho gstt-gap-id-parity-check.sql (GSTT) và cssd-tram-fk-health-audit.sql (CSSD trạm).
-- Chỉ kiểm các tham chiếu KHÔNG được FK constraint bảo vệ (soft reference / text link)
-- + FK NOT VALID còn treo. Kỳ vọng mọi *_orphan = 0.
SELECT jsonb_build_object(
  -- FK khai báo nhưng chưa validate (migration NOT VALID còn treo) trên mọi bảng fact
  'fact_fk_not_validated', (
    SELECT COUNT(*) FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND c.contype = 'f' AND NOT c.convalidated
      AND t.relname LIKE '%\_fact\_%'
  ),
  -- NKBV: người báo cáo mẫu số daily (cột không có FK)
  'nkbv_mau_so_daily_nguoi_bao_cao_orphan', (
    SELECT COUNT(*) FROM public.nkbv_fact_mau_so_daily d
    WHERE d.nguoi_bao_cao_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.mdm_nhan_su ns WHERE ns.id = d.nguoi_bao_cao_id)
  ),
  -- NKBV: sự kiện / vi sinh trỏ mã bệnh án không tồn tại trong bệnh án (text link)
  'nkbv_su_kien_ma_benh_an_orphan', (
    SELECT COUNT(*) FROM public.nkbv_fact_su_kien e
    WHERE COALESCE(TRIM(e.ma_benh_an), '') <> ''
      AND NOT EXISTS (
        SELECT 1 FROM public.nkbv_fact_benh_an b WHERE b.ma_benh_an = e.ma_benh_an
      )
  ),
  'nkbv_vi_sinh_ma_benh_an_orphan', (
    SELECT COUNT(*) FROM public.nkbv_fact_vi_sinh v
    WHERE COALESCE(TRIM(v.ma_benh_an), '') <> ''
      AND NOT EXISTS (
        SELECT 1 FROM public.nkbv_fact_benh_an b WHERE b.ma_benh_an = v.ma_benh_an
      )
  ),
  -- QLCV: việc đang mở nhưng người phụ trách đã ngừng hoạt động (rác nghiệp vụ)
  'qlcv_viec_mo_phu_trach_inactive', (
    SELECT COUNT(*) FROM public.qlcv_fact_cong_viec cv
    JOIN public.mdm_nhan_su ns ON ns.id = cv.nguoi_phu_trach_id
    WHERE cv.trang_thai NOT IN ('HOAN_THANH', 'DA_HUY', 'TU_CHOI')
      AND ns.is_active = false
  ),
  -- Kho hóa chất CSSD: giao dịch trỏ hóa chất đã tắt trong danh mục
  'cssd_kho_hoa_chat_dm_inactive', (
    SELECT COUNT(*) FROM public.cssd_fact_kho_hoa_chat_giao_dich gd
    JOIN public.cssd_dm_hoa_chat hc ON hc.id = gd.dm_hoa_chat_id
    WHERE hc.is_active = false
  )
) AS fact_orphan_fk_sweep;
