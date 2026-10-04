-- Soft-local MOD-QLCV · QLCV-01 + QLCV-02 (CHƯA apply — chờ Nghĩa migrate local).
-- QLCV-01: fn_qlcv_today_vn(); view/RPC/cron dùng ngày Asia/Ho_Chi_Minh.
-- QLCV-02: fn_sync_overdue_tasks chỉ MOI/DANG_LAM → QUA_HAN; view quá hạn lọc is_active.
-- Cron overdue giữ 5 17 * * * (00:05 VN) — khớp prod.

-- ── 1) Hôm nay VN ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_qlcv_today_vn()
RETURNS date
LANGUAGE sql
STABLE
SET search_path TO public
AS $$
  SELECT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
$$;

COMMENT ON FUNCTION public.fn_qlcv_today_vn() IS
  'QLCV: ngày lịch Asia/Ho_Chi_Minh — SSOT cho quá hạn / board / cron (khớp spawn).';

GRANT EXECUTE ON FUNCTION public.fn_qlcv_today_vn() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_qlcv_today_vn() TO service_role;

-- ── 2) Cron quá hạn — chỉ MOI / DANG_LAM (QLCV-02) + ngày VN (QLCV-01) ─────
CREATE OR REPLACE FUNCTION public.fn_sync_overdue_tasks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_today date := public.fn_qlcv_today_vn();
  r record;
BEGIN
  FOR r IN
    UPDATE public.qlcv_fact_cong_viec
    SET trang_thai = 'QUA_HAN', updated_at = NOW()
    WHERE han_hoan_thanh IS NOT NULL
      AND han_hoan_thanh < v_today
      AND is_active = true
      AND trang_thai = ANY (ARRAY['MOI', 'DANG_LAM']::text[])
    RETURNING id, phan_tram_hoan_thanh, han_hoan_thanh
  LOOP
    PERFORM public.fn_qlcv_append_nhat_ky(
      r.id, 'CAP_NHAT', NULL,
      'Hệ thống tự động: chuyển Quá hạn (hạn chót ' || r.han_hoan_thanh::text || ').',
      'QUA_HAN', COALESCE(r.phan_tram_hoan_thanh, 0)
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.fn_sync_overdue_tasks() IS
  'QLCV-02/01: chỉ MOI/DANG_LAM → QUA_HAN khi hạn < fn_qlcv_today_vn(); không đè TU_CHOI/CHO_DUYET.';

-- ── 3) View — is_qua_han theo ngày VN; đề xuất không vào list quá hạn ───────
CREATE OR REPLACE VIEW public.v_qlcv_cong_viec_full WITH (security_invoker = true) AS
SELECT
  cv.id,
  cv.tieu_de,
  cv.mo_ta,
  cv.loai_cong_viec,
  CASE cv.loai_cong_viec
    WHEN 'DINH_KY' THEN 'Định kỳ'
    WHEN 'DOT_XUAT' THEN 'Đột xuất'
    WHEN 'KHAN_CAP' THEN 'Khẩn cấp'
    ELSE cv.loai_cong_viec
  END AS ten_loai_cong_viec,
  cv.trang_thai,
  CASE cv.trang_thai
    WHEN 'MOI' THEN 'Mới'
    WHEN 'DANG_LAM' THEN 'Đang làm'
    WHEN 'CHO_DUYET' THEN 'Chờ nghiệm thu'
    WHEN 'HOAN_THANH' THEN 'Hoàn thành'
    WHEN 'TU_CHOI' THEN 'Từ chối'
    WHEN 'QUA_HAN' THEN 'Quá hạn'
    WHEN 'DA_HUY' THEN 'Đã hủy'
    WHEN 'CHUA_BAT_DAU' THEN 'Chưa bắt đầu'
    WHEN 'DANG_THUC_HIEN' THEN 'Đang thực hiện'
    ELSE cv.trang_thai
  END AS ten_trang_thai_hien_thi,
  CASE cv.trang_thai
    WHEN 'MOI' THEN '#94A3B8'
    WHEN 'DANG_LAM' THEN '#3B82F6'
    WHEN 'CHO_DUYET' THEN '#F59E0B'
    WHEN 'HOAN_THANH' THEN '#10B981'
    WHEN 'TU_CHOI' THEN '#EF4444'
    WHEN 'QUA_HAN' THEN '#DC2626'
    WHEN 'DA_HUY' THEN '#6B7280'
    WHEN 'CHUA_BAT_DAU' THEN '#6B7280'
    WHEN 'DANG_THUC_HIEN' THEN '#3B82F6'
    WHEN 'CHO_NHAN_VIEC' THEN '#3B82F6'
    WHEN 'CHO_XAC_NHAN_HOAN_THANH' THEN '#F59E0B'
    ELSE NULL
  END AS trang_thai_mau_sac,
  cv.muc_do_uu_tien,
  cv.han_hoan_thanh,
  cv.ngay_thuc_hien,
  cv.gio_bat_dau,
  cv.gio_ket_thuc,
  cv.dia_diem_khoa_id,
  kp.ma_khoa AS dia_diem_khoa_ma,
  kp.ten_khoa AS dia_diem_khoa_ten,
  cv.nhiem_vu_id,
  nv.ten AS nhiem_vu_ten,
  cv.phan_tram_hoan_thanh,
  cv.nguoi_tao_id,
  cv.nguoi_giao_viec_id,
  cv.nguoi_phu_trach_id,
  cv.to_cong_tac_id,
  cv.dinh_ky_mau_id,
  cv.vi_tri_thuc_hien,
  cv.nguoi_phoi_hop_ids,
  cv.nguoi_theo_doi_ids,
  cv.is_active,
  cv.created_at,
  cv.updated_at,
  ns_tao.ho_ten AS nguoi_tao_ten,
  ns_phu.ho_ten AS nguoi_phu_trach_ten,
  ns_giao.ho_ten AS nguoi_giao_ten,
  t.ten_to AS to_cong_tac_ten,
  (
    cv.han_hoan_thanh IS NOT NULL
    AND cv.han_hoan_thanh < public.fn_qlcv_today_vn()
    AND cv.trang_thai <> ALL (ARRAY['HOAN_THANH'::text, 'DA_HUY'::text])
  ) AS is_qua_han,
  cv.checklist,
  cv.nhat_ky,
  cv.analytics_meta
FROM public.qlcv_fact_cong_viec cv
LEFT JOIN public.mdm_nhan_su ns_tao ON cv.nguoi_tao_id = ns_tao.id
LEFT JOIN public.mdm_nhan_su ns_phu ON cv.nguoi_phu_trach_id = ns_phu.id
LEFT JOIN public.mdm_nhan_su ns_giao ON cv.nguoi_giao_viec_id = ns_giao.id
LEFT JOIN public.mdm_dm_to_cong_tac t ON cv.to_cong_tac_id = t.id
LEFT JOIN public.mdm_dm_khoa_phong kp ON cv.dia_diem_khoa_id = kp.id
LEFT JOIN public.qlcv_fact_nhiem_vu nv ON cv.nhiem_vu_id = nv.id;

CREATE OR REPLACE VIEW public.v_qlcv_cong_viec_qua_han WITH (security_invoker = true) AS
SELECT * FROM public.v_qlcv_cong_viec_full
WHERE is_qua_han = true AND coalesce(is_active, true) = true;

GRANT SELECT ON public.v_qlcv_cong_viec_full TO anon, authenticated, service_role;
GRANT SELECT ON public.v_qlcv_cong_viec_qua_han TO anon, authenticated, service_role;

COMMENT ON VIEW public.v_qlcv_cong_viec_full IS
  'QLCV: is_qua_han theo fn_qlcv_today_vn(); labels CASE (Wave3).';

-- ── 4) Board counts — CURRENT_DATE → fn_qlcv_today_vn() ─────────────────────
CREATE OR REPLACE FUNCTION public.rpc_qlcv_board_counts(p_actor_staff_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT
      t.id,
      t.trang_thai,
      t.is_active,
      coalesce(t.phan_tram_hoan_thanh, 0) AS pct,
      t.loai_cong_viec,
      coalesce(t.is_qua_han, false) AS is_qua_han,
      t.han_hoan_thanh,
      t.nguoi_phu_trach_id,
      t.nguoi_tao_id,
      t.nguoi_giao_viec_id,
      coalesce(t.nguoi_phoi_hop_ids, '{}'::uuid[]) AS nguoi_phoi_hop_ids,
      CASE
        WHEN t.trang_thai = 'DA_HUY' THEN 'DA_HUY'
        WHEN t.trang_thai = 'HOAN_THANH' THEN 'HOAN_THANH'
        WHEN coalesce(t.is_active, true) = false
          AND (
            t.trang_thai = 'DE_XUAT_CHO_DUYET'
            OR t.trang_thai = 'MOI'
          ) THEN 'DE_XUAT'
        WHEN t.loai_cong_viec IS DISTINCT FROM 'DINH_KY'
          AND t.trang_thai IS DISTINCT FROM 'HOAN_THANH'
          AND t.trang_thai IS DISTINCT FROM 'DA_HUY'
          AND t.trang_thai IS DISTINCT FROM 'TU_CHOI'
          AND (
            t.trang_thai = 'CHO_DUYET'
            OR (
              coalesce(t.phan_tram_hoan_thanh, 0) >= 100
              AND (
                t.trang_thai IN ('DANG_LAM', 'QUA_HAN')
                OR coalesce(t.is_qua_han, false) = true
                OR (
                  t.han_hoan_thanh IS NOT NULL
                  AND (t.han_hoan_thanh::date < public.fn_qlcv_today_vn())
                )
              )
            )
          ) THEN 'CHO_DUYET'
        WHEN coalesce(t.is_active, true) = true THEN 'DANG_LAM'
        ELSE NULL
      END AS lane
    FROM public.v_qlcv_cong_viec_full t
  ),
  active AS (
    SELECT * FROM base WHERE is_active = true AND lane IS NOT NULL
  )
  SELECT jsonb_build_object(
    'columns',
    jsonb_build_object(
      'DANG_LAM', (SELECT count(*)::int FROM active WHERE lane = 'DANG_LAM'),
      'CHO_DUYET', (SELECT count(*)::int FROM active WHERE lane = 'CHO_DUYET'),
      'HOAN_THANH', (SELECT count(*)::int FROM active WHERE lane = 'HOAN_THANH'),
      'DA_HUY', (SELECT count(*)::int FROM active WHERE lane = 'DA_HUY'),
      'DE_XUAT', (SELECT count(*)::int FROM base WHERE lane = 'DE_XUAT')
    ),
    'gates',
    jsonb_build_object(
      'in_progress', (SELECT count(*)::int FROM active WHERE lane = 'DANG_LAM'),
      'overdue', (
        SELECT count(*)::int FROM active a
        WHERE a.lane IS DISTINCT FROM 'HOAN_THANH'
          AND a.lane IS DISTINCT FROM 'DA_HUY'
          AND (
            a.trang_thai = 'QUA_HAN'
            OR a.is_qua_han = true
            OR (
              a.han_hoan_thanh IS NOT NULL
              AND (a.han_hoan_thanh::date < public.fn_qlcv_today_vn())
            )
          )
      ),
      'cho_toi',
      CASE
        WHEN p_actor_staff_id IS NULL THEN 0
        ELSE (
          SELECT count(*)::int FROM base b
          WHERE b.lane IN ('DE_XUAT', 'CHO_DUYET')
            AND (
              b.nguoi_phu_trach_id = p_actor_staff_id
              OR b.nguoi_giao_viec_id = p_actor_staff_id
              OR p_actor_staff_id = ANY (b.nguoi_phoi_hop_ids)
            )
        )
      END,
      'my_tasks',
      CASE
        WHEN p_actor_staff_id IS NULL THEN 0
        ELSE (
          SELECT count(*)::int FROM base b
          WHERE b.lane IS DISTINCT FROM 'HOAN_THANH'
            AND b.lane IS DISTINCT FROM 'DA_HUY'
            AND (
              b.nguoi_phu_trach_id = p_actor_staff_id
              OR (
                b.lane = 'DE_XUAT'
                AND b.nguoi_tao_id = p_actor_staff_id
              )
            )
        )
      END
    )
  );
$function$;

COMMENT ON FUNCTION public.rpc_qlcv_board_counts(uuid) IS
  'Gate/column counts; quá hạn theo fn_qlcv_today_vn(); TU_CHOI không vào CHO_DUYET.';

GRANT EXECUTE ON FUNCTION public.rpc_qlcv_board_counts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_qlcv_board_counts(uuid) TO service_role;

-- ── 5) Đảm bảo cron overdue = 00:05 VN (5 17 * * *) ─────────────────────────
DO $$
DECLARE
  v_cron_exists BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') INTO v_cron_exists;
  IF NOT v_cron_exists THEN
    RAISE NOTICE 'pg_cron chưa cài — bỏ qua reschedule qlcv-sync-overdue-tasks';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'qlcv-sync-overdue-tasks') THEN
    PERFORM cron.unschedule('qlcv-sync-overdue-tasks');
  END IF;
  PERFORM cron.schedule(
    'qlcv-sync-overdue-tasks',
    '5 17 * * *',
    'SELECT public.fn_sync_overdue_tasks();'
  );
END $$;

NOTIFY pgrst, 'reload schema';
