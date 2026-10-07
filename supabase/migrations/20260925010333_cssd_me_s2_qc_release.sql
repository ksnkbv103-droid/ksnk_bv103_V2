-- ME-S2: chương trình, QC có cấu trúc, BI, nhả mẻ (additive).
-- Không ghi thoi_gian_cap_phat / nguoi_cap_phat_id khi nhả — chỉ lúc quét cấp phát.
-- Rollback: DROP FUNCTION mới; DROP INDEX rồi tạo lại index S1 nếu cần;
-- cột additive để lại (không DROP COLUMN).

BEGIN;

ALTER TABLE public.cssd_fact_lo_tiet_khuan
  ADD COLUMN IF NOT EXISTS chuong_trinh text,
  ADD COLUMN IF NOT EXISTS phuong_phap text,
  ADD COLUMN IF NOT EXISTS co_implant boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trang_thai_bi text,
  ADD COLUMN IF NOT EXISTS trang_thai_me text,
  ADD COLUMN IF NOT EXISTS nguoi_nha_id uuid,
  ADD COLUMN IF NOT EXISTS thoi_gian_nha timestamptz,
  ADD COLUMN IF NOT EXISTS nguoi_bat_dau_id uuid,
  ADD COLUMN IF NOT EXISTS nguoi_ket_thuc_id uuid;

ALTER TABLE public.cssd_dm_bo_dung_cu
  ADD COLUMN IF NOT EXISTS is_implant boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.cssd_dm_bo_dung_cu.is_implant IS
  'ME-S2: bộ thuộc danh mục implant — mẻ có ≥1 bộ này thì BI bắt buộc.';
COMMENT ON COLUMN public.cssd_fact_lo_tiet_khuan.trang_thai_me IS
  'DANG_CHUAN_NAP | DANG_TIET_KHUAN | CHO_DANH_GIA_QC | CHO_BI | HOAN_THANH | QC_KHONG_DAT';
COMMENT ON COLUMN public.cssd_fact_lo_tiet_khuan.trang_thai_bi IS
  'CHUA_CO | AM | DUONG — kết quả BI thật, không chỉ nhãn UI.';
COMMENT ON COLUMN public.cssd_fact_lo_tiet_khuan.phuong_phap IS
  'HOI_NUOC | PLASMA_H2O2 | EO — suy từ mã loại máy, không từ tên.';
COMMENT ON COLUMN public.cssd_fact_lo_tiet_khuan.nguoi_nha_id IS
  'User phiên nhả mẻ. Không phải người cấp phát.';

UPDATE public.cssd_fact_lo_tiet_khuan
SET trang_thai_me = CASE
  WHEN ket_qua_test IS TRUE THEN 'HOAN_THANH'
  WHEN ket_qua_test IS FALSE THEN 'QC_KHONG_DAT'
  WHEN tk_mo_form_qc_at IS NOT NULL THEN 'CHO_DANH_GIA_QC'
  WHEN tk_chot_nap_at IS NOT NULL THEN 'DANG_TIET_KHUAN'
  ELSE 'DANG_CHUAN_NAP'
END
WHERE trang_thai_me IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cssd_fact_lo_tiet_khuan_trang_thai_me_chk'
  ) THEN
    ALTER TABLE public.cssd_fact_lo_tiet_khuan
      ADD CONSTRAINT cssd_fact_lo_tiet_khuan_trang_thai_me_chk
      CHECK (
        trang_thai_me IS NULL
        OR trang_thai_me IN (
          'DANG_CHUAN_NAP', 'DANG_TIET_KHUAN', 'CHO_DANH_GIA_QC',
          'CHO_BI', 'HOAN_THANH', 'QC_KHONG_DAT'
        )
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cssd_fact_lo_tiet_khuan_trang_thai_bi_chk'
  ) THEN
    ALTER TABLE public.cssd_fact_lo_tiet_khuan
      ADD CONSTRAINT cssd_fact_lo_tiet_khuan_trang_thai_bi_chk
      CHECK (trang_thai_bi IS NULL OR trang_thai_bi IN ('CHUA_CO', 'AM', 'DUONG'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cssd_fact_lo_tiet_khuan_phuong_phap_chk'
  ) THEN
    ALTER TABLE public.cssd_fact_lo_tiet_khuan
      ADD CONSTRAINT cssd_fact_lo_tiet_khuan_phuong_phap_chk
      CHECK (phuong_phap IS NULL OR phuong_phap IN ('HOI_NUOC', 'PLASMA_H2O2', 'EO'));
  END IF;
END $$;

DROP INDEX IF EXISTS public.uq_cssd_fact_lo_mo_mot_may;

DO $$
DECLARE
  v_dup int;
BEGIN
  SELECT count(*)::int INTO v_dup
  FROM (
    SELECT thiet_bi_id
    FROM public.cssd_fact_lo_tiet_khuan
    WHERE is_active = true
      AND ket_qua_test IS NULL
      AND thiet_bi_id IS NOT NULL
      AND coalesce(trang_thai_me, '') <> 'CHO_BI'
    GROUP BY thiet_bi_id
    HAVING count(*) > 1
  ) d;

  IF v_dup > 0 THEN
    RAISE NOTICE 'ME-S2: % máy còn hơn một mẻ mở (không tính CHO_BI) — không xóa dữ liệu. Index chỉ áp mẻ tạo từ 2026-09-25 10:00+07.', v_dup;
    EXECUTE $idx$
      CREATE UNIQUE INDEX uq_cssd_fact_lo_mo_mot_may
      ON public.cssd_fact_lo_tiet_khuan (thiet_bi_id)
      WHERE is_active = true
        AND ket_qua_test IS NULL
        AND thiet_bi_id IS NOT NULL
        AND coalesce(trang_thai_me, '') <> 'CHO_BI'
        AND created_at >= TIMESTAMPTZ '2026-09-25 10:00:00+07'
    $idx$;
  ELSE
    EXECUTE $idx$
      CREATE UNIQUE INDEX uq_cssd_fact_lo_mo_mot_may
      ON public.cssd_fact_lo_tiet_khuan (thiet_bi_id)
      WHERE is_active = true
        AND ket_qua_test IS NULL
        AND thiet_bi_id IS NOT NULL
        AND coalesce(trang_thai_me, '') <> 'CHO_BI'
    $idx$;
  END IF;
END $$;

COMMENT ON INDEX public.uq_cssd_fact_lo_mo_mot_may IS
  'Mỗi máy một mẻ chưa kết luận. Mẻ CHO_BI không khóa máy. Dữ liệu cũ trùng thì index chỉ từ mốc migration.';

CREATE OR REPLACE FUNCTION public.fn_cssd_me_phuong_phap(p_thiet_bi_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT CASE upper(btrim(coalesce(lm.ma_loai_may, '')))
    WHEN 'LM_HOI_NUOC' THEN 'HOI_NUOC'
    WHEN 'HOI_NUOC' THEN 'HOI_NUOC'
    WHEN 'LM_PLASMA' THEN 'PLASMA_H2O2'
    WHEN 'PLASMA_H2O2' THEN 'PLASMA_H2O2'
    WHEN 'LM_EO' THEN 'EO'
    WHEN 'EO' THEN 'EO'
    ELSE NULL
  END
  FROM public.cssd_dm_thiet_bi tb
  LEFT JOIN public.cssd_dm_loai_may lm ON lm.id = tb.loai_may_id
  WHERE tb.id = p_thiet_bi_id;
$$;

CREATE OR REPLACE FUNCTION public.fn_cssd_me_may_la_hoi_nuoc(p_thiet_bi_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT coalesce(public.fn_cssd_me_phuong_phap(p_thiet_bi_id) = 'HOI_NUOC', false);
$$;

CREATE OR REPLACE FUNCTION public.fn_cssd_me_chuyen_bo_kho_vo_khuan(
  p_me_id uuid,
  p_ids uuid[],
  p_now timestamptz,
  p_nguoi_nhan_su_id uuid
) RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_cap uuid;
  v_tk uuid;
  v_n int;
BEGIN
  SELECT t.id INTO v_tk
  FROM public.cssd_dm_tram t
  WHERE t.ma_tram = 'TIET_KHUAN' AND coalesce(t.is_active, true) = true
  LIMIT 1;
  SELECT t.id INTO v_cap
  FROM public.cssd_dm_tram t
  WHERE t.ma_tram = 'CAP_PHAT' AND coalesce(t.is_active, true) = true
  LIMIT 1;
  IF v_tk IS NULL OR v_cap IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy trạm TIỆT KHUẨN hoặc CẤP PHÁT.';
  END IF;

  UPDATE public.cssd_fact_quy_trinh AS q
  SET
    tram_hien_tai_id = v_cap,
    thoi_gian_tiet_khuan = p_now,
    ngay_het_han = p_now + make_interval(days => coalesce(src.so_ngay, 30)),
    han_su_dung = p_now + make_interval(days => coalesce(src.so_ngay, 30)),
    tinh_trang = 'BINH_THUONG',
    nguoi_tiet_khuan_id = coalesce(p_nguoi_nhan_su_id, q.nguoi_tiet_khuan_id),
    updated_at = p_now
  FROM (
    SELECT q1.id, l.so_ngay_han_dung AS so_ngay
    FROM public.cssd_fact_quy_trinh q1
    LEFT JOIN public.cssd_dm_bo_dung_cu b ON b.id = q1.bo_dung_cu_id
    LEFT JOIN public.cssd_dm_loai_dung_cu l ON l.id = b.loai_dung_cu_id
    WHERE q1.id = ANY (p_ids)
  ) src
  WHERE q.id = src.id
    AND q.lo_tiet_khuan_id = p_me_id
    AND q.is_active = true
    AND q.tram_hien_tai_id = v_tk;

  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_cssd_me_tao(
  p_thiet_bi_id uuid,
  p_actor_user_id uuid,
  p_ghi_chu text DEFAULT NULL,
  p_chuong_trinh text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_tb public.cssd_dm_thiet_bi%ROWTYPE;
  v_pp text;
  v_token text;
  v_ddmmyy text;
  v_seq int;
  v_ma text;
  v_chuong text;
  v_today date;
  v_id uuid;
  v_open text;
BEGIN
  IF p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'Không xác định được người thực hiện.';
  END IF;
  IF p_thiet_bi_id IS NULL THEN
    RAISE EXCEPTION 'Thiếu máy tiệt khuẩn.';
  END IF;

  SELECT * INTO v_tb
  FROM public.cssd_dm_thiet_bi
  WHERE id = p_thiet_bi_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy thiết bị.';
  END IF;
  IF coalesce(v_tb.trang_thai, '') NOT IN ('READY', 'HOAT_DONG') THEN
    RAISE EXCEPTION 'Thiết bị không sẵn sàng. Không tạo mẻ.';
  END IF;

  v_pp := public.fn_cssd_me_phuong_phap(p_thiet_bi_id);
  IF v_pp IS NULL THEN
    RAISE EXCEPTION 'Chỉ máy tiệt khuẩn (hơi nước, plasma, EO) mới tạo được mẻ.';
  END IF;

  v_today := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  IF v_pp = 'HOI_NUOC' THEN
    IF coalesce(v_tb.specs->>'bd_dau_ngay_ymd', '') IS DISTINCT FROM to_char(v_today, 'YYYY-MM-DD')
       OR upper(coalesce(v_tb.specs->>'bd_dau_ngay_ket_qua', '')) IS DISTINCT FROM 'DAT' THEN
      RAISE EXCEPTION 'Máy hơi nước chưa có Bowie–Dick đầu ngày ĐẠT. Ghi BD đạt trước khi tạo mẻ.';
    END IF;
  END IF;

  SELECT ma_lo_tiet_khuan INTO v_open
  FROM public.cssd_fact_lo_tiet_khuan
  WHERE thiet_bi_id = p_thiet_bi_id
    AND is_active = true
    AND ket_qua_test IS NULL
    AND coalesce(trang_thai_me, '') <> 'CHO_BI'
  LIMIT 1;
  IF v_open IS NOT NULL THEN
    RAISE EXCEPTION 'Máy đang có mẻ chưa kết luận (%). Kết thúc mẻ đó trước khi tạo mẻ mới.', v_open;
  END IF;

  v_token := left(
    upper(regexp_replace(coalesce(nullif(btrim(v_tb.ma_thiet_bi), ''), nullif(btrim(v_tb.ten_thiet_bi), ''), 'MAY'), '[^A-Za-z0-9]+', '', 'g')),
    12
  );
  IF coalesce(v_token, '') = '' THEN
    v_token := 'MAY';
  END IF;
  v_ddmmyy := to_char(v_today, 'DDMMYY');
  SELECT count(*)::int INTO v_seq
  FROM public.cssd_fact_lo_tiet_khuan
  WHERE thiet_bi_id = p_thiet_bi_id
    AND (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = v_today;
  v_seq := coalesce(v_seq, 0);
  LOOP
    v_seq := v_seq + 1;
    v_ma := v_token || '-' || v_ddmmyy || '-' || v_seq::text;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.cssd_fact_lo_tiet_khuan WHERE ma_lo_tiet_khuan = v_ma
    );
    IF v_seq > 500 THEN
      RAISE EXCEPTION 'Không sinh được mã mẻ.';
    END IF;
  END LOOP;

  v_chuong := nullif(left(btrim(coalesce(p_chuong_trinh, '')), 80), '');
  IF v_chuong IS NULL THEN
    SELECT nullif(left(btrim(chuong_trinh), 80), '') INTO v_chuong
    FROM public.cssd_fact_lo_tiet_khuan
    WHERE thiet_bi_id = p_thiet_bi_id
      AND nullif(btrim(chuong_trinh), '') IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;
  IF v_chuong IS NULL THEN
    v_chuong := nullif(left(btrim(coalesce(v_tb.specs->>'chuong_trinh', v_tb.specs->>'chuong_trinh_mac_dinh', '')), 80), '');
  END IF;

  INSERT INTO public.cssd_fact_lo_tiet_khuan (
    ma_lo_tiet_khuan, thiet_bi_id, loai_may_id, phuong_phap, chuong_trinh,
    ghi_chu, is_active, trang_thai_me, updated_at
  ) VALUES (
    v_ma, p_thiet_bi_id, v_tb.loai_may_id, v_pp, v_chuong,
    nullif(btrim(coalesce(p_ghi_chu, '')), ''), true, 'DANG_CHUAN_NAP', now()
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_id,
    'ma_lo_tiet_khuan', v_ma,
    'phuong_phap', v_pp,
    'chuong_trinh', v_chuong,
    'loai_may_id', v_tb.loai_may_id
  );
END;
$$;

DROP FUNCTION IF EXISTS public.rpc_cssd_me_bat_dau(uuid);

CREATE OR REPLACE FUNCTION public.rpc_cssd_me_bat_dau(
  p_me_id uuid,
  p_actor_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_me public.cssd_fact_lo_tiet_khuan%ROWTYPE;
  v_ids uuid[];
  v_id uuid;
  v_ma text;
  v_tram text;
  v_active boolean;
  v_dong boolean;
  v_role text;
  v_bo uuid;
  v_may_tt text;
  v_steam boolean;
  v_heat text;
  v_dong_goi uuid;
  v_tk uuid;
  v_now timestamptz := now();
  v_n int;
  v_expect int;
BEGIN
  IF p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'Không xác định được người thực hiện.';
  END IF;

  SELECT * INTO v_me
  FROM public.cssd_fact_lo_tiet_khuan
  WHERE id = p_me_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy mẻ.';
  END IF;
  IF v_me.tk_chot_nap_at IS NOT NULL THEN
    RAISE EXCEPTION 'Mẻ đã bắt đầu tiệt khuẩn trước đó.';
  END IF;
  IF v_me.ket_qua_test IS NOT NULL THEN
    RAISE EXCEPTION 'Mẻ đã kết thúc đánh giá — không thể bắt đầu lại.';
  END IF;
  IF coalesce(v_me.trang_thai_me, '') = 'CHO_BI' THEN
    RAISE EXCEPTION 'Mẻ đang chờ BI — không bắt đầu lại.';
  END IF;
  IF v_me.thiet_bi_id IS NULL THEN
    RAISE EXCEPTION 'Mẻ chưa gắn máy — không bắt đầu tiệt khuẩn.';
  END IF;

  SELECT tb.trang_thai INTO v_may_tt
  FROM public.cssd_dm_thiet_bi tb
  WHERE tb.id = v_me.thiet_bi_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy thiết bị.';
  END IF;
  IF coalesce(v_may_tt, '') NOT IN ('READY', 'HOAT_DONG') THEN
    RAISE EXCEPTION 'Thiết bị không sẵn sàng (%). Không thể bắt đầu mẻ.', coalesce(v_may_tt, '—');
  END IF;

  SELECT coalesce(array_agg(s.id), ARRAY[]::uuid[])
  INTO v_ids
  FROM (
    SELECT q.id
    FROM public.cssd_fact_quy_trinh q
    WHERE q.lo_tiet_khuan_id = p_me_id
    ORDER BY q.id
    FOR UPDATE OF q
  ) s;

  v_expect := coalesce(cardinality(v_ids), 0);
  IF v_expect = 0 THEN
    RAISE EXCEPTION 'Chưa có bộ nào trong mẻ — không thể bắt đầu tiệt khuẩn.';
  END IF;

  v_steam := public.fn_cssd_me_may_la_hoi_nuoc(v_me.thiet_bi_id);

  FOREACH v_id IN ARRAY v_ids LOOP
    SELECT
      coalesce(nullif(btrim(q.ma_qr_quy_trinh), ''), v_id::text),
      coalesce(q.is_active, false),
      coalesce(q.is_dong_bang, false),
      q.ma_vai_tro_bo,
      q.bo_dung_cu_id,
      t.ma_tram
    INTO v_ma, v_active, v_dong, v_role, v_bo, v_tram
    FROM public.cssd_fact_quy_trinh q
    LEFT JOIN public.cssd_dm_tram t ON t.id = q.tram_hien_tai_id
    WHERE q.id = v_id;

    IF NOT v_active THEN
      RAISE EXCEPTION 'Bộ % không còn hiệu lực — không bắt đầu mẻ.', v_ma;
    END IF;
    IF v_dong THEN
      RAISE EXCEPTION 'Bộ % đang khóa an toàn — không bắt đầu mẻ.', v_ma;
    END IF;
    IF coalesce(v_tram, '') <> 'DONG_GOI' THEN
      RAISE EXCEPTION 'Bộ % không ở ĐÓNG GÓI (hiện %) — không bắt đầu mẻ.', v_ma, coalesce(v_tram, '—');
    END IF;
    IF public.fn_cssd_me_la_bo_me_sub(v_id, v_role) THEN
      RAISE EXCEPTION 'Bộ % là bộ mẹ đã có SUB — chỉ quét bộ thành phần vào mẻ.', v_ma;
    END IF;
    IF v_steam THEN
      v_heat := public.fn_cssd_me_ly_do_chan_nhiet(v_bo);
      IF v_heat IS NOT NULL THEN
        RAISE EXCEPTION '% Bộ %.', v_heat, v_ma;
      END IF;
    END IF;
  END LOOP;

  SELECT t.id INTO v_dong_goi
  FROM public.cssd_dm_tram t
  WHERE t.ma_tram = 'DONG_GOI' AND coalesce(t.is_active, true) = true
  LIMIT 1;
  SELECT t.id INTO v_tk
  FROM public.cssd_dm_tram t
  WHERE t.ma_tram = 'TIET_KHUAN' AND coalesce(t.is_active, true) = true
  LIMIT 1;
  IF v_dong_goi IS NULL OR v_tk IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy trạm ĐÓNG GÓI hoặc TIỆT KHUẨN.';
  END IF;

  UPDATE public.cssd_fact_lo_tiet_khuan
  SET tk_chot_nap_at = v_now,
      thoi_gian_bat_dau = v_now,
      nguoi_bat_dau_id = p_actor_user_id,
      trang_thai_me = 'DANG_TIET_KHUAN',
      updated_at = v_now
  WHERE id = p_me_id
    AND tk_chot_nap_at IS NULL
    AND ket_qua_test IS NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'Mẻ đã bắt đầu hoặc đã kết luận — không ghi đè.';
  END IF;

  UPDATE public.cssd_fact_quy_trinh AS q
  SET tram_hien_tai_id = v_tk,
      updated_at = v_now
  WHERE q.lo_tiet_khuan_id = p_me_id
    AND q.id = ANY (v_ids)
    AND q.is_active = true
    AND coalesce(q.is_dong_bang, false) = false
    AND q.tram_hien_tai_id = v_dong_goi;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> v_expect THEN
    RAISE EXCEPTION 'Không cập nhật đủ bộ khi bắt đầu mẻ — thao tác đã hủy.';
  END IF;

  RETURN jsonb_build_object('ok', true, 'quy_trinh_ids', to_jsonb(v_ids));
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_cssd_me_ket_luan_dat(
  p_me_id uuid,
  p_ghi_chu text,
  p_qc_json jsonb,
  p_ket_qua_bi boolean,
  p_ket_qua_ci boolean,
  p_nguoi_nhan_su_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_me public.cssd_fact_lo_tiet_khuan%ROWTYPE;
  v_ids uuid[];
  v_tk uuid;
  v_now timestamptz := now();
  v_n int;
  v_expect int;
  v_actor uuid;
  v_qc jsonb := coalesce(p_qc_json, '{}'::jsonb);
BEGIN
  IF coalesce(v_qc->>'thong_so_vat_ly', '') IS DISTINCT FROM 'DAT'
     OR coalesce(v_qc->>'ci_ngoai_goi', '') IS DISTINCT FROM 'DAT'
     OR coalesce(v_qc->>'ci_pcd', '') IS DISTINCT FROM 'DAT' THEN
    RAISE EXCEPTION 'Nhả mẻ chỉ khi thông số vật lý, CI ngoài gói và CI PCD đều ĐẠT.';
  END IF;
  IF coalesce(v_qc->>'trang_thai_bi', '') = 'DUONG' THEN
    RAISE EXCEPTION 'BI dương — không nhả mẻ.';
  END IF;
  IF coalesce(v_qc->>'bi_bat_buoc', '') IN ('true', 't')
     AND coalesce(v_qc->>'trang_thai_bi', '') IS DISTINCT FROM 'AM' THEN
    RAISE EXCEPTION 'BI bắt buộc chưa âm — không nhả mẻ.';
  END IF;

  BEGIN
    IF coalesce(v_qc->>'actor_user_id', '') <> '' THEN
      v_actor := (v_qc->>'actor_user_id')::uuid;
    END IF;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Người thực hiện không hợp lệ.';
  END;
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Không xác định được người nhả mẻ.';
  END IF;

  SELECT * INTO v_me
  FROM public.cssd_fact_lo_tiet_khuan
  WHERE id = p_me_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy mẻ tiệt khuẩn.';
  END IF;
  IF v_me.tk_mo_form_qc_at IS NULL THEN
    RAISE EXCEPTION 'Chưa mở bước đánh giá QC — bấm «Xong máy — mở đánh giá QC» trước.';
  END IF;
  IF v_me.ket_qua_test IS NOT NULL OR coalesce(v_me.trang_thai_me, '') IN ('HOAN_THANH', 'QC_KHONG_DAT', 'CHO_BI') THEN
    RAISE EXCEPTION 'Mẻ đã có kết quả QC — không ghi đè.';
  END IF;

  SELECT t.id INTO v_tk
  FROM public.cssd_dm_tram t
  WHERE t.ma_tram = 'TIET_KHUAN' AND coalesce(t.is_active, true) = true
  LIMIT 1;
  IF v_tk IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy trạm TIỆT KHUẨN.';
  END IF;

  SELECT coalesce(array_agg(s.id), ARRAY[]::uuid[])
  INTO v_ids
  FROM (
    SELECT q.id
    FROM public.cssd_fact_quy_trinh q
    WHERE q.lo_tiet_khuan_id = p_me_id
      AND q.is_active = true
      AND q.tram_hien_tai_id = v_tk
    ORDER BY q.id
    FOR UPDATE OF q
  ) s;

  v_expect := coalesce(cardinality(v_ids), 0);
  IF v_expect = 0 THEN
    RAISE EXCEPTION 'Không có bộ đang ở trạm tiệt khuẩn trong mẻ — không kết luận ĐẠT.';
  END IF;

  v_n := public.fn_cssd_me_chuyen_bo_kho_vo_khuan(p_me_id, v_ids, v_now, p_nguoi_nhan_su_id);
  IF v_n <> v_expect THEN
    RAISE EXCEPTION 'Không cập nhật đủ bộ khi kết luận ĐẠT — thao tác đã hủy.';
  END IF;

  UPDATE public.cssd_fact_lo_tiet_khuan
  SET
    ket_qua_test = true,
    ghi_chu = p_ghi_chu,
    ghi_chu_qc = p_ghi_chu,
    tk_qc_json = v_qc,
    thoi_gian_ket_thuc = coalesce(thoi_gian_ket_thuc, v_now),
    ket_qua_bi = p_ket_qua_bi,
    ket_qua_ci = p_ket_qua_ci,
    nhiet_do = CASE
      WHEN jsonb_typeof(v_qc->'nhiet_do') = 'number' THEN (v_qc->>'nhiet_do')::numeric
      ELSE nhiet_do
    END,
    ap_suat = CASE
      WHEN jsonb_typeof(v_qc->'ap_suat') = 'number' THEN (v_qc->>'ap_suat')::numeric
      ELSE ap_suat
    END,
    thoi_gian_chu_ky = CASE
      WHEN jsonb_typeof(v_qc->'thoi_gian_chu_ky') = 'number' THEN (v_qc->>'thoi_gian_chu_ky')::integer
      ELSE thoi_gian_chu_ky
    END,
    chuong_trinh = coalesce(nullif(left(btrim(v_qc->>'chuong_trinh'), 80), ''), chuong_trinh),
    phuong_phap = coalesce(nullif(v_qc->>'phuong_phap', ''), phuong_phap),
    co_implant = CASE WHEN v_qc->>'co_implant' IN ('true', 't') THEN true ELSE co_implant END,
    trang_thai_bi = nullif(v_qc->>'trang_thai_bi', ''),
    nguoi_ket_thuc_id = coalesce(nguoi_ket_thuc_id, v_actor),
    nguoi_nha_id = v_actor,
    thoi_gian_nha = v_now,
    trang_thai_me = 'HOAN_THANH',
    nguoi_van_hanh_id = coalesce(p_nguoi_nhan_su_id, nguoi_van_hanh_id),
    updated_at = v_now
  WHERE id = p_me_id
    AND ket_qua_test IS NULL
    AND tk_mo_form_qc_at IS NOT NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'Mẻ đã có kết quả QC — không ghi đè.';
  END IF;

  RETURN jsonb_build_object('ok', true, 'quy_trinh_ids', to_jsonb(v_ids), 'trang_thai_me', 'HOAN_THANH');
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_cssd_me_ghi_cho_bi(
  p_me_id uuid,
  p_ghi_chu text,
  p_qc_json jsonb,
  p_ket_qua_ci boolean,
  p_nguoi_nhan_su_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_me public.cssd_fact_lo_tiet_khuan%ROWTYPE;
  v_now timestamptz := now();
  v_n int;
  v_actor uuid;
  v_qc jsonb := coalesce(p_qc_json, '{}'::jsonb);
BEGIN
  IF coalesce(v_qc->>'thong_so_vat_ly', '') IS DISTINCT FROM 'DAT'
     OR coalesce(v_qc->>'ci_ngoai_goi', '') IS DISTINCT FROM 'DAT'
     OR coalesce(v_qc->>'ci_pcd', '') IS DISTINCT FROM 'DAT' THEN
    RAISE EXCEPTION 'Chờ BI chỉ khi thông số vật lý, CI ngoài gói và CI PCD đều ĐẠT.';
  END IF;
  IF coalesce(v_qc->>'trang_thai_bi', '') IS DISTINCT FROM 'CHUA_CO' THEN
    RAISE EXCEPTION 'Trạng thái BI không phải chưa có kết quả.';
  END IF;

  BEGIN
    v_actor := (v_qc->>'actor_user_id')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Người thực hiện không hợp lệ.';
  END;

  SELECT * INTO v_me
  FROM public.cssd_fact_lo_tiet_khuan
  WHERE id = p_me_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy mẻ tiệt khuẩn.';
  END IF;
  IF v_me.tk_mo_form_qc_at IS NULL THEN
    RAISE EXCEPTION 'Chưa mở bước đánh giá QC.';
  END IF;
  IF v_me.ket_qua_test IS NOT NULL OR coalesce(v_me.trang_thai_me, '') IN ('HOAN_THANH', 'QC_KHONG_DAT', 'CHO_BI') THEN
    RAISE EXCEPTION 'Mẻ đã có kết quả QC — không ghi đè.';
  END IF;

  UPDATE public.cssd_fact_lo_tiet_khuan
  SET
    ghi_chu = p_ghi_chu,
    ghi_chu_qc = p_ghi_chu,
    tk_qc_json = v_qc,
    thoi_gian_ket_thuc = coalesce(thoi_gian_ket_thuc, v_now),
    ket_qua_bi = NULL,
    ket_qua_ci = p_ket_qua_ci,
    nhiet_do = CASE WHEN jsonb_typeof(v_qc->'nhiet_do') = 'number' THEN (v_qc->>'nhiet_do')::numeric ELSE nhiet_do END,
    ap_suat = CASE WHEN jsonb_typeof(v_qc->'ap_suat') = 'number' THEN (v_qc->>'ap_suat')::numeric ELSE ap_suat END,
    thoi_gian_chu_ky = CASE WHEN jsonb_typeof(v_qc->'thoi_gian_chu_ky') = 'number' THEN (v_qc->>'thoi_gian_chu_ky')::integer ELSE thoi_gian_chu_ky END,
    chuong_trinh = coalesce(nullif(left(btrim(v_qc->>'chuong_trinh'), 80), ''), chuong_trinh),
    phuong_phap = coalesce(nullif(v_qc->>'phuong_phap', ''), phuong_phap),
    co_implant = CASE WHEN v_qc->>'co_implant' IN ('true', 't') THEN true ELSE co_implant END,
    trang_thai_bi = 'CHUA_CO',
    trang_thai_me = 'CHO_BI',
    nguoi_ket_thuc_id = coalesce(nguoi_ket_thuc_id, v_actor),
    nguoi_van_hanh_id = coalesce(p_nguoi_nhan_su_id, nguoi_van_hanh_id),
    updated_at = v_now
  WHERE id = p_me_id
    AND ket_qua_test IS NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'Không ghi được trạng thái chờ BI.';
  END IF;

  RETURN jsonb_build_object('ok', true, 'trang_thai_me', 'CHO_BI');
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_cssd_me_nhap_bi_am(
  p_me_id uuid,
  p_actor_user_id uuid,
  p_nguoi_nhan_su_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_me public.cssd_fact_lo_tiet_khuan%ROWTYPE;
  v_ids uuid[];
  v_tk uuid;
  v_now timestamptz := now();
  v_n int;
  v_expect int;
BEGIN
  IF p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'Không xác định được người thực hiện.';
  END IF;

  SELECT * INTO v_me
  FROM public.cssd_fact_lo_tiet_khuan
  WHERE id = p_me_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy mẻ tiệt khuẩn.';
  END IF;
  IF coalesce(v_me.trang_thai_me, '') IS DISTINCT FROM 'CHO_BI' THEN
    RAISE EXCEPTION 'Chỉ nhập BI cho mẻ đang chờ BI.';
  END IF;
  IF v_me.ket_qua_test IS NOT NULL THEN
    RAISE EXCEPTION 'Mẻ đã có kết quả — không ghi đè.';
  END IF;

  SELECT t.id INTO v_tk
  FROM public.cssd_dm_tram t
  WHERE t.ma_tram = 'TIET_KHUAN' AND coalesce(t.is_active, true) = true
  LIMIT 1;
  IF v_tk IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy trạm TIỆT KHUẨN.';
  END IF;

  SELECT coalesce(array_agg(s.id), ARRAY[]::uuid[])
  INTO v_ids
  FROM (
    SELECT q.id
    FROM public.cssd_fact_quy_trinh q
    WHERE q.lo_tiet_khuan_id = p_me_id
      AND q.is_active = true
      AND q.tram_hien_tai_id = v_tk
    ORDER BY q.id
    FOR UPDATE OF q
  ) s;
  v_expect := coalesce(cardinality(v_ids), 0);
  IF v_expect = 0 THEN
    RAISE EXCEPTION 'Không có bộ đang ở trạm tiệt khuẩn — không nhả mẻ.';
  END IF;

  v_n := public.fn_cssd_me_chuyen_bo_kho_vo_khuan(p_me_id, v_ids, v_now, p_nguoi_nhan_su_id);
  IF v_n <> v_expect THEN
    RAISE EXCEPTION 'Không cập nhật đủ bộ khi nhả sau BI âm — thao tác đã hủy.';
  END IF;

  UPDATE public.cssd_fact_lo_tiet_khuan
  SET
    ket_qua_test = true,
    ket_qua_bi = true,
    trang_thai_bi = 'AM',
    trang_thai_me = 'HOAN_THANH',
    nguoi_nha_id = p_actor_user_id,
    thoi_gian_nha = v_now,
    tk_qc_json = coalesce(tk_qc_json, '{}'::jsonb) || jsonb_build_object('trang_thai_bi', 'AM', 'nha_sau_bi_am', true),
    updated_at = v_now
  WHERE id = p_me_id
    AND ket_qua_test IS NULL
    AND trang_thai_me = 'CHO_BI';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'Không nhả được mẻ sau BI âm.';
  END IF;

  RETURN jsonb_build_object('ok', true, 'quy_trinh_ids', to_jsonb(v_ids), 'trang_thai_me', 'HOAN_THANH');
END;
$$;

REVOKE ALL ON FUNCTION public.fn_cssd_me_phuong_phap(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_cssd_me_chuyen_bo_kho_vo_khuan(uuid, uuid[], timestamptz, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_cssd_me_tao(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_cssd_me_bat_dau(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_cssd_me_ghi_cho_bi(uuid, text, jsonb, boolean, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_cssd_me_nhap_bi_am(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.fn_cssd_me_phuong_phap(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_cssd_me_may_la_hoi_nuoc(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_cssd_me_chuyen_bo_kho_vo_khuan(uuid, uuid[], timestamptz, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_me_tao(uuid, uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_me_bat_dau(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_me_ket_luan_dat(uuid, text, jsonb, boolean, boolean, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_me_ghi_cho_bi(uuid, text, jsonb, boolean, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_me_nhap_bi_am(uuid, uuid, uuid) TO service_role;

COMMIT;
