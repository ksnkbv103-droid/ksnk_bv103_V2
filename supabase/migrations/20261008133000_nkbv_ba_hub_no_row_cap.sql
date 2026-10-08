-- Hub một bệnh án: bỏ LIMIT cắt im LIS / phiếu / ngày khoa / ngày dụng cụ / mốc.
-- Một hồ sơ dài hơn trần cũ bị mất mẫu số và xét nghiệm. Giữ LIMIT 1 ở dòng bệnh án.

CREATE OR REPLACE FUNCTION public.fn_nkbv_ba_hub(p_ma_benh_an text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'stay', (
      SELECT to_jsonb(s)
      FROM (
        SELECT id, ma_benh_an, ma_benh_nhan, ho_ten_benh_nhan, ngay_sinh, gioi_tinh,
               ngay_vao_vien, ngay_ra_vien, khoa_dieu_tri_id, ket_cuc_dieu_tri,
               ly_do_tu_vong, tu_vong_lien_quan_nkbv
        FROM public.nkbv_fact_benh_an
        WHERE ma_benh_an = p_ma_benh_an AND is_active = true
        LIMIT 1
      ) s
    ),
    'lis', COALESCE((
      SELECT jsonb_agg(to_jsonb(l) ORDER BY l.ngay_lay_mau)
      FROM (
        SELECT id, ma_xet_nghiem, loai_benh_pham, loai_benh_pham_chuan, ngay_lay_mau, tac_nhan, so_luong,
               ket_qua_phan_loai, ket_qua_duong_tinh, is_mdro, mdro_phenotype, metadata
        FROM public.nkbv_fact_vi_sinh
        WHERE ma_benh_an = p_ma_benh_an AND is_active = true
        ORDER BY ngay_lay_mau ASC, id ASC
      ) l
    ), '[]'::jsonb),
    'cases', COALESCE((
      SELECT jsonb_agg(to_jsonb(c) ORDER BY c.ngay_phat_hien DESC)
      FROM (
        SELECT id, ma_ca, loai_ma, loai_ten, trang_thai_ma, trang_thai_ten,
               ngay_phat_hien, vi_tri_nhiem_khuan, verification_data, tac_nhan_vi_khuan,
               khoa_ghi_nhan_id
        FROM public.v_nkbv_su_kien_full
        WHERE ma_benh_an = p_ma_benh_an AND is_active = true
        ORDER BY ngay_phat_hien DESC, id ASC
      ) c
    ), '[]'::jsonb),
    'location_days', COALESCE((
      SELECT jsonb_agg(to_jsonb(k) ORDER BY k.ngay_lich)
      FROM (
        SELECT ngay_lich, khoa_id
        FROM public.nkbv_fact_ba_ngay_khoa
        WHERE ma_benh_an = p_ma_benh_an
        ORDER BY ngay_lich ASC, id ASC
      ) k
    ), '[]'::jsonb),
    'device_days', COALESCE((
      SELECT jsonb_agg(to_jsonb(d) ORDER BY d.ngay_lich, d.loai_dung_cu)
      FROM (
        SELECT id, ngay_lich, loai_dung_cu
        FROM public.nkbv_fact_ba_ngay_dung_cu
        WHERE ma_benh_an = p_ma_benh_an
        ORDER BY ngay_lich ASC, loai_dung_cu ASC, id ASC
      ) d
    ), '[]'::jsonb),
    'devices', COALESCE((
      SELECT jsonb_agg(to_jsonb(v))
      FROM (
        SELECT
          ma_benh_an || ':' || loai_dung_cu || ':' || ngay_dat::text AS id,
          CASE loai_dung_cu
            WHEN 'CVC' THEN 'CENTRAL_LINE'
            WHEN 'VENT' THEN 'VENTILATOR'
            ELSE 'FOLEY'
          END AS device_type,
          ngay_dat AS insertion_date,
          ngay_rut AS removal_date,
          true AS is_active
        FROM public.nkbv_v_ba_dung_cu_dat_rut
        WHERE ma_benh_an = p_ma_benh_an
      ) v
    ), '[]'::jsonb),
    'manual', COALESCE((
      SELECT jsonb_agg(to_jsonb(m) ORDER BY m.milestone_date)
      FROM (
        SELECT id, milestone_kind, milestone_date, title, detail, specimen_hint, criteria_key
        FROM public.nkbv_fact_ba_timeline
        WHERE ma_benh_an = p_ma_benh_an AND is_active = true
        ORDER BY milestone_date ASC, id ASC
      ) m
    ), '[]'::jsonb)
  );
$$;

COMMENT ON FUNCTION public.fn_nkbv_ba_hub(text) IS
  'Hub BA: stay + LIS + phiếu + ngày–khoa + ngày–dụng cụ + mốc lâm sàng. Không cắt số dòng.';

GRANT EXECUTE ON FUNCTION public.fn_nkbv_ba_hub(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_nkbv_ba_hub(text) TO service_role;
