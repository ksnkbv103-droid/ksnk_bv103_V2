-- L4a kiểm trigger chuyển trạng thái mẻ (cssd_dm_me_chuyen_tiep) trên DB LOCAL, mọi ca trong BEGIN…ROLLBACK.
-- Chạy: docker exec -i supabase_db_ksnk_bv103 psql -U postgres -v ON_ERROR_STOP=1 < scripts/sql/kiem-cssd-me-chuyen-tiep.sql
-- Kỳ vọng: in «PASS …» cho mọi ca; lỗi đầu tiên dừng script (exit ≠ 0).

-- Ca 1 (fail-first): UPDATE trực tiếp HOAN_THANH → CHO_DANH_GIA_QC phải bị chặn.
BEGIN;
DO $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.cssd_fact_lo_tiet_khuan (ma_lo_tiet_khuan, trang_thai_me, ket_qua_test, is_active)
  VALUES ('L4A-TEST-' || gen_random_uuid(), 'HOAN_THANH', true, false) RETURNING id INTO v_id;
  BEGIN
    UPDATE public.cssd_fact_lo_tiet_khuan SET trang_thai_me = 'CHO_DANH_GIA_QC' WHERE id = v_id;
  EXCEPTION WHEN others THEN
    IF SQLERRM LIKE '%từ HOAN_THANH sang CHO_DANH_GIA_QC%' THEN
      RAISE NOTICE 'PASS ca1: bị chặn — %', SQLERRM;
      RETURN;
    END IF;
    RAISE;
  END;
  RAISE EXCEPTION 'FAIL ca1: UPDATE HOAN_THANH → CHO_DANH_GIA_QC KHÔNG bị chặn';
END $$;
ROLLBACK;

-- Ca 2: cập nhật cột khác / gán trùng giá trị không bị chặn; X → NULL bị chặn.
BEGIN;
DO $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.cssd_fact_lo_tiet_khuan (ma_lo_tiet_khuan, trang_thai_me, ket_qua_test, is_active)
  VALUES ('L4A-TEST-' || gen_random_uuid(), 'QC_KHONG_DAT', false, false) RETURNING id INTO v_id;
  UPDATE public.cssd_fact_lo_tiet_khuan SET trang_thai_me = 'QC_KHONG_DAT', ghi_chu = 'x' WHERE id = v_id;
  BEGIN
    UPDATE public.cssd_fact_lo_tiet_khuan SET trang_thai_me = NULL WHERE id = v_id;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'PASS ca2: trùng giá trị qua, X→NULL bị chặn — %', SQLERRM;
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL ca2: QC_KHONG_DAT → NULL KHÔNG bị chặn';
END $$;
ROLLBACK;

-- Ca 3 (happy path bằng RPC thật, vai service_role như app):
-- tạo → kết thúc nạp → bắt đầu → kết thúc tiệt khuẩn → ghi test đạt → kết luận đạt; rồi BI dương → thu hồi.
BEGIN;
UPDATE public.cssd_dm_thiet_bi SET trang_thai = 'READY', specs = (coalesce(specs, '{}'::jsonb) - 'bd_hold_bao_tri_xong_at')
  || jsonb_build_object('bd_dau_ngay_ymd', to_char((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date, 'YYYY-MM-DD'), 'bd_dau_ngay_ket_qua', 'DAT')
  WHERE id IN ('db359d50-bdbe-4aac-b7f3-9edaa24b91b6', '9ea58c1f-edc1-455d-8f6f-44631b01e6aa');
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
SET LOCAL ROLE service_role;
DO $$
DECLARE
  v_actor uuid := (SELECT ns.auth_user_id FROM public.mdm_nhan_su ns
                   JOIN public.v_sys_user_permissions v ON v.auth_user_id = ns.auth_user_id
                   WHERE ns.is_active AND v.roles ? 'ADMIN' LIMIT 1);
  v_ns uuid;
  v_r jsonb;
  v_id uuid;
  v_st text;
BEGIN
  v_ns := (SELECT id FROM public.mdm_nhan_su WHERE auth_user_id = v_actor AND is_active LIMIT 1);
  v_r := to_jsonb(public.rpc_cssd_me_tao('9ea58c1f-edc1-455d-8f6f-44631b01e6aa', v_actor, 'L4A happy', NULL));
  v_id := coalesce((v_r->>'id')::uuid, (v_r->>'me_id')::uuid, (v_r #>> '{}')::uuid);
  INSERT INTO public.cssd_fact_quy_trinh (ma_qr_quy_trinh, tram_hien_tai_id, lo_tiet_khuan_id, is_active, bo_dung_cu_id)
  VALUES ('L4A-QR-' || gen_random_uuid(), (SELECT id FROM public.cssd_dm_tram WHERE ma_tram = 'DONG_GOI' LIMIT 1), v_id, true, 'fbdd9b43-2efc-44c6-92d7-61f0e871c52a');
  SELECT trang_thai_me INTO v_st FROM public.cssd_fact_lo_tiet_khuan WHERE id = v_id;
  RAISE NOTICE 'tao → %', v_st;
  v_r := public.rpc_cssd_me_ket_thuc_nap(v_id, v_actor);
  RAISE NOTICE 'ket_thuc_nap → %', v_r;
  v_r := public.rpc_cssd_me_bat_dau(v_id, v_actor);
  RAISE NOTICE 'bat_dau → %', v_r->>'trang_thai_me';
  v_r := public.rpc_cssd_me_ket_thuc_tiet_khuan(v_id, v_actor);
  RAISE NOTICE 'ket_thuc_tiet_khuan → %', v_r->>'trang_thai_me';
  v_r := public.rpc_cssd_me_ghi_test(v_id, 'THONG_SO_VAT_LY', 'DAT', '{}'::jsonb, v_actor);
  RAISE NOTICE 'ghi_test DAT → %', v_r->>'trang_thai_me';
  v_r := public.rpc_cssd_me_ket_luan_dat(v_id, 'L4A', jsonb_build_object('thong_so_vat_ly','DAT','ci_ngoai_goi','DAT','ci_pcd','DAT','actor_user_id',v_actor), NULL, true, v_ns);
  SELECT trang_thai_me INTO v_st FROM public.cssd_fact_lo_tiet_khuan WHERE id = v_id;
  IF v_st <> 'HOAN_THANH' THEN RAISE EXCEPTION 'FAIL ca3: ket_luan_dat → %', v_st; END IF;
  RAISE NOTICE 'ket_luan_dat → %', v_st;
  v_r := public.rpc_cssd_me_thu_hoi(v_id, 'BI_DUONG', v_actor, v_ns, 'L4A_TEST', 'L4A test', 'L4A BI dương');
  SELECT trang_thai_me INTO v_st FROM public.cssd_fact_lo_tiet_khuan WHERE id = v_id;
  IF v_st <> 'THU_HOI' THEN RAISE EXCEPTION 'FAIL ca3: thu_hoi → %', v_st; END IF;
  RAISE NOTICE 'PASS ca3: happy path + BI dương → %', v_st;
END $$;
ROLLBACK;

-- Ca 4: nhánh CHO_BI → BI âm → HOAN_THANH, và nhánh test không đạt → QC_KHONG_DAT → thu hồi QC_FAIL.
BEGIN;
UPDATE public.cssd_dm_thiet_bi SET trang_thai = 'READY', specs = (coalesce(specs, '{}'::jsonb) - 'bd_hold_bao_tri_xong_at')
  || jsonb_build_object('bd_dau_ngay_ymd', to_char((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date, 'YYYY-MM-DD'), 'bd_dau_ngay_ket_qua', 'DAT')
  WHERE id IN ('db359d50-bdbe-4aac-b7f3-9edaa24b91b6', '9ea58c1f-edc1-455d-8f6f-44631b01e6aa');
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
SET LOCAL ROLE service_role;
DO $$
DECLARE
  v_actor uuid := (SELECT ns.auth_user_id FROM public.mdm_nhan_su ns
                   JOIN public.v_sys_user_permissions v ON v.auth_user_id = ns.auth_user_id
                   WHERE ns.is_active AND v.roles ? 'ADMIN' LIMIT 1);
  v_ns uuid;
  v_r jsonb;
  v_id uuid;
  v_id2 uuid;
  v_st text;
BEGIN
  v_ns := (SELECT id FROM public.mdm_nhan_su WHERE auth_user_id = v_actor AND is_active LIMIT 1);
  -- CHO_BI → HOAN_THANH
  v_r := to_jsonb(public.rpc_cssd_me_tao('9ea58c1f-edc1-455d-8f6f-44631b01e6aa', v_actor, 'L4A bi', NULL));
  v_id := coalesce((v_r->>'id')::uuid, (v_r->>'me_id')::uuid, (v_r #>> '{}')::uuid);
  INSERT INTO public.cssd_fact_quy_trinh (ma_qr_quy_trinh, tram_hien_tai_id, lo_tiet_khuan_id, is_active, bo_dung_cu_id)
  VALUES ('L4A-QR-' || gen_random_uuid(), (SELECT id FROM public.cssd_dm_tram WHERE ma_tram = 'DONG_GOI' LIMIT 1), v_id, true, 'fbdd9b43-2efc-44c6-92d7-61f0e871c52a');
  PERFORM public.rpc_cssd_me_ket_thuc_nap(v_id, v_actor);
  PERFORM public.rpc_cssd_me_bat_dau(v_id, v_actor);
  PERFORM public.rpc_cssd_me_ket_thuc_tiet_khuan(v_id, v_actor);
  PERFORM public.rpc_cssd_me_ghi_cho_bi(v_id, 'L4A', jsonb_build_object('thong_so_vat_ly','DAT','ci_ngoai_goi','DAT','ci_pcd','DAT','actor_user_id',v_actor,'trang_thai_bi','CHUA_CO'), true, v_ns);
  SELECT trang_thai_me INTO v_st FROM public.cssd_fact_lo_tiet_khuan WHERE id = v_id;
  RAISE NOTICE 'ghi_cho_bi → %', v_st;
  PERFORM public.rpc_cssd_me_nhap_bi_am(v_id, v_actor, v_ns, jsonb_build_object('ong_doi_chung','DUONG','ong_thu','AM','so_lo_bi','L4A','gio_bat_dau_u','08:00','gio_doc','09:00'));
  SELECT trang_thai_me INTO v_st FROM public.cssd_fact_lo_tiet_khuan WHERE id = v_id;
  IF v_st <> 'HOAN_THANH' THEN RAISE EXCEPTION 'FAIL ca4: nhap_bi_am → %', v_st; END IF;
  RAISE NOTICE 'nhap_bi_am → %', v_st;
  -- test không đạt khi CHO_DANH_GIA_QC → QC_KHONG_DAT → thu hồi QC_FAIL (hơi nước)
  v_r := to_jsonb(public.rpc_cssd_me_tao('9ea58c1f-edc1-455d-8f6f-44631b01e6aa', v_actor, 'L4A fail', NULL));
  v_id2 := coalesce((v_r->>'id')::uuid, (v_r->>'me_id')::uuid, (v_r #>> '{}')::uuid);
  INSERT INTO public.cssd_fact_quy_trinh (ma_qr_quy_trinh, tram_hien_tai_id, lo_tiet_khuan_id, is_active, bo_dung_cu_id)
  VALUES ('L4A-QR-' || gen_random_uuid(), (SELECT id FROM public.cssd_dm_tram WHERE ma_tram = 'DONG_GOI' LIMIT 1), v_id2, true, 'fbdd9b43-2efc-44c6-92d7-61f0e871c52a');
  PERFORM public.rpc_cssd_me_ket_thuc_nap(v_id2, v_actor);
  PERFORM public.rpc_cssd_me_bat_dau(v_id2, v_actor);
  PERFORM public.rpc_cssd_me_ket_thuc_tiet_khuan(v_id2, v_actor);
  v_r := public.rpc_cssd_me_ghi_test(v_id2, 'CI_PCD', 'KHONG_DAT', '{}'::jsonb, v_actor);
  RAISE NOTICE 'ghi_test KHONG_DAT → %', v_r->>'trang_thai_me';
  PERFORM public.rpc_cssd_me_thu_hoi(v_id2, 'QC_FAIL', v_actor, v_ns, 'L4A_TEST', 'L4A test', 'L4A QC fail');
  SELECT trang_thai_me INTO v_st FROM public.cssd_fact_lo_tiet_khuan WHERE id = v_id2;
  IF v_st <> 'QC_KHONG_DAT' THEN RAISE EXCEPTION 'FAIL ca4: thu_hoi QC_FAIL → %', v_st; END IF;
  RAISE NOTICE 'PASS ca4: CHO_BI→HOAN_THANH; QC_KHONG_DAT→thu hồi → %', v_st;
END $$;
ROLLBACK;

-- ===================== L4b: rpc_cssd_me_thu_hoi kiểm trạng thái mẻ (M05 §4.1) =====================
-- Dữ liệu dựng bằng INSERT (trigger chỉ chạy khi UPDATE) trên máy 9ea58c1f…; mẻ mốc BI âm 10 giờ trước
-- để cửa sổ R5.29 chỉ gồm mẻ thử. Mọi ca trong BEGIN…ROLLBACK.

-- Ca 5: BI dương mẻ gốc HOAN_THANH; cửa sổ có CHO_BI, CHO_DANH_GIA_QC, QC_KHONG_DAT có lô đã cấp phát,
-- QC_KHONG_DAT chưa cấp phát → gốc THU_HOI; CHO_BI/CHO_DANH_GIA_QC → QC_KHONG_DAT;
-- QC_KHONG_DAT có lô cấp phát → THU_HOI; QC_KHONG_DAT không cấp phát → giữ.
BEGIN;
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
SET LOCAL ROLE service_role;
DO $$
DECLARE
  v_may uuid := '9ea58c1f-edc1-455d-8f6f-44631b01e6aa';
  v_actor uuid := (SELECT ns.auth_user_id FROM public.mdm_nhan_su ns
                   JOIN public.v_sys_user_permissions v ON v.auth_user_id = ns.auth_user_id
                   WHERE ns.is_active AND v.roles ? 'ADMIN' LIMIT 1);
  v_ns uuid;
  v_goc uuid; v_bi uuid; v_qc uuid; v_kd_cp uuid; v_kd uuid;
  v_st text; v_bad text := '';
BEGIN
  v_ns := (SELECT id FROM public.mdm_nhan_su WHERE auth_user_id = v_actor AND is_active LIMIT 1);
  UPDATE public.cssd_fact_lo_tiet_khuan SET is_active = false
   WHERE thiet_bi_id = v_may AND is_active AND ket_qua_test IS NULL
     AND coalesce(trang_thai_me, '') NOT IN ('CHO_BI','HOAN_THANH','QC_KHONG_DAT','THU_HOI');
  INSERT INTO public.cssd_fact_lo_tiet_khuan (ma_lo_tiet_khuan, thiet_bi_id, trang_thai_me, ket_qua_test, trang_thai_bi, ket_qua_bi, thoi_gian_bat_dau, is_active)
  VALUES ('L4B-AM-' || gen_random_uuid(), v_may, 'HOAN_THANH', true, 'AM', true, now() - interval '10 hours', true);
  INSERT INTO public.cssd_fact_lo_tiet_khuan (ma_lo_tiet_khuan, thiet_bi_id, trang_thai_me, ket_qua_test, thoi_gian_bat_dau, is_active)
  VALUES ('L4B-BI-' || gen_random_uuid(), v_may, 'CHO_BI', NULL, now() - interval '5 hours', true) RETURNING id INTO v_bi;
  INSERT INTO public.cssd_fact_lo_tiet_khuan (ma_lo_tiet_khuan, thiet_bi_id, trang_thai_me, ket_qua_test, thoi_gian_bat_dau, is_active)
  VALUES ('L4B-QC-' || gen_random_uuid(), v_may, 'CHO_DANH_GIA_QC', NULL, now() - interval '4 hours', true) RETURNING id INTO v_qc;
  INSERT INTO public.cssd_fact_lo_tiet_khuan (ma_lo_tiet_khuan, thiet_bi_id, trang_thai_me, ket_qua_test, thoi_gian_bat_dau, is_active)
  VALUES ('L4B-KDCP-' || gen_random_uuid(), v_may, 'QC_KHONG_DAT', false, now() - interval '3 hours', true) RETURNING id INTO v_kd_cp;
  INSERT INTO public.cssd_fact_quy_trinh (ma_qr_quy_trinh, tram_hien_tai_id, lo_tiet_khuan_id, is_active, bo_dung_cu_id, thoi_gian_cap_phat)
  VALUES ('L4B-QR-' || gen_random_uuid(), (SELECT id FROM public.cssd_dm_tram WHERE ma_tram = 'CAP_PHAT' LIMIT 1), v_kd_cp, true, 'fbdd9b43-2efc-44c6-92d7-61f0e871c52a', now() - interval '2 hours');
  INSERT INTO public.cssd_fact_lo_tiet_khuan (ma_lo_tiet_khuan, thiet_bi_id, trang_thai_me, ket_qua_test, thoi_gian_bat_dau, is_active)
  VALUES ('L4B-KD-' || gen_random_uuid(), v_may, 'QC_KHONG_DAT', false, now() - interval '150 minutes', true) RETURNING id INTO v_kd;
  INSERT INTO public.cssd_fact_lo_tiet_khuan (ma_lo_tiet_khuan, thiet_bi_id, trang_thai_me, ket_qua_test, thoi_gian_bat_dau, is_active)
  VALUES ('L4B-GOC-' || gen_random_uuid(), v_may, 'HOAN_THANH', true, now() - interval '1 hour', true) RETURNING id INTO v_goc;

  PERFORM public.rpc_cssd_me_thu_hoi(v_goc, 'BI_DUONG', v_actor, v_ns, 'L4B_TEST', 'L4B test', 'L4B ca5');

  SELECT trang_thai_me INTO v_st FROM public.cssd_fact_lo_tiet_khuan WHERE id = v_goc;
  IF v_st <> 'THU_HOI' THEN v_bad := v_bad || ' gốc=' || v_st; END IF;
  SELECT trang_thai_me INTO v_st FROM public.cssd_fact_lo_tiet_khuan WHERE id = v_bi;
  IF v_st <> 'QC_KHONG_DAT' THEN v_bad := v_bad || ' CHO_BI→' || v_st; END IF;
  SELECT trang_thai_me INTO v_st FROM public.cssd_fact_lo_tiet_khuan WHERE id = v_qc;
  IF v_st <> 'QC_KHONG_DAT' THEN v_bad := v_bad || ' CHO_DANH_GIA_QC→' || v_st; END IF;
  SELECT trang_thai_me INTO v_st FROM public.cssd_fact_lo_tiet_khuan WHERE id = v_kd_cp;
  IF v_st <> 'THU_HOI' THEN v_bad := v_bad || ' QC_KHONG_DAT(cấp phát)→' || v_st; END IF;
  SELECT trang_thai_me INTO v_st FROM public.cssd_fact_lo_tiet_khuan WHERE id = v_kd;
  IF v_st <> 'QC_KHONG_DAT' THEN v_bad := v_bad || ' QC_KHONG_DAT(chưa cấp)→' || v_st; END IF;
  IF v_bad <> '' THEN RAISE EXCEPTION 'FAIL ca5:%', v_bad; END IF;
  RAISE NOTICE 'PASS ca5: gốc THU_HOI; CHO_BI/CHO_DANH_GIA_QC→QC_KHONG_DAT; QC_KHONG_DAT cấp phát→THU_HOI, chưa cấp giữ';
END $$;
ROLLBACK;

-- Ca 6: mẻ DANG_TIET_KHUAN trong cửa sổ KHÔNG bị đụng (trạng thái, ket_qua_test, lô);
-- mẻ gốc DANG_TIET_KHUAN (BI_DUONG) và DANG_CHUAN_NAP (QC_FAIL) → RAISE.
BEGIN;
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
SET LOCAL ROLE service_role;
DO $$
DECLARE
  v_may uuid := '9ea58c1f-edc1-455d-8f6f-44631b01e6aa';
  v_actor uuid := (SELECT ns.auth_user_id FROM public.mdm_nhan_su ns
                   JOIN public.v_sys_user_permissions v ON v.auth_user_id = ns.auth_user_id
                   WHERE ns.is_active AND v.roles ? 'ADMIN' LIMIT 1);
  v_ns uuid;
  v_goc uuid; v_tk uuid; v_q uuid; v_cn uuid;
  v_st text; v_kq boolean; v_qa boolean; v_ok boolean;
BEGIN
  v_ns := (SELECT id FROM public.mdm_nhan_su WHERE auth_user_id = v_actor AND is_active LIMIT 1);
  -- dọn mẻ mở sẵn có trên máy (trong giao dịch) để chỉ mục một-mẻ-mở không chặn
  UPDATE public.cssd_fact_lo_tiet_khuan SET is_active = false
   WHERE thiet_bi_id = v_may AND is_active AND ket_qua_test IS NULL
     AND coalesce(trang_thai_me, '') NOT IN ('CHO_BI','HOAN_THANH','QC_KHONG_DAT','THU_HOI');
  INSERT INTO public.cssd_fact_lo_tiet_khuan (ma_lo_tiet_khuan, thiet_bi_id, trang_thai_me, ket_qua_test, trang_thai_bi, ket_qua_bi, thoi_gian_bat_dau, is_active)
  VALUES ('L4B-AM-' || gen_random_uuid(), v_may, 'HOAN_THANH', true, 'AM', true, now() - interval '10 hours', true);
  INSERT INTO public.cssd_fact_lo_tiet_khuan (ma_lo_tiet_khuan, thiet_bi_id, trang_thai_me, ket_qua_test, thoi_gian_bat_dau, is_active)
  VALUES ('L4B-TK-' || gen_random_uuid(), v_may, 'DANG_TIET_KHUAN', NULL, now() - interval '3 hours', true) RETURNING id INTO v_tk;
  INSERT INTO public.cssd_fact_quy_trinh (ma_qr_quy_trinh, tram_hien_tai_id, lo_tiet_khuan_id, is_active, bo_dung_cu_id)
  VALUES ('L4B-QR-' || gen_random_uuid(), (SELECT id FROM public.cssd_dm_tram WHERE ma_tram = 'TIET_KHUAN' LIMIT 1), v_tk, true, 'fbdd9b43-2efc-44c6-92d7-61f0e871c52a')
  RETURNING id INTO v_q;
  INSERT INTO public.cssd_fact_lo_tiet_khuan (ma_lo_tiet_khuan, thiet_bi_id, trang_thai_me, ket_qua_test, thoi_gian_bat_dau, is_active)
  VALUES ('L4B-GOC-' || gen_random_uuid(), v_may, 'HOAN_THANH', true, now() - interval '1 hour', true) RETURNING id INTO v_goc;

  PERFORM public.rpc_cssd_me_thu_hoi(v_goc, 'BI_DUONG', v_actor, v_ns, 'L4B_TEST', 'L4B test', 'L4B ca6');
  SELECT trang_thai_me, ket_qua_test INTO v_st, v_kq FROM public.cssd_fact_lo_tiet_khuan WHERE id = v_tk;
  SELECT is_active INTO v_qa FROM public.cssd_fact_quy_trinh WHERE id = v_q;
  IF v_st <> 'DANG_TIET_KHUAN' OR v_kq IS NOT NULL OR v_qa IS NOT TRUE THEN
    RAISE EXCEPTION 'FAIL ca6: mẻ DANG_TIET_KHUAN bị đụng → %, ket_qua_test=%, lô active=%', v_st, v_kq, v_qa;
  END IF;

  v_ok := false;
  BEGIN
    PERFORM public.rpc_cssd_me_thu_hoi(v_tk, 'BI_DUONG', v_actor, v_ns, 'L4B_TEST', 'L4B test', 'L4B ca6 gốc đang chạy');
  EXCEPTION WHEN others THEN
    v_ok := SQLERRM LIKE '%không thu hồi%'; RAISE NOTICE 'ca6 gốc DANG_TIET_KHUAN BI_DUONG → %', SQLERRM;
  END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FAIL ca6: thu hồi BI_DUONG mẻ gốc DANG_TIET_KHUAN không bị chặn rõ'; END IF;

  UPDATE public.cssd_fact_lo_tiet_khuan SET is_active = false WHERE id = v_tk;
  INSERT INTO public.cssd_fact_lo_tiet_khuan (ma_lo_tiet_khuan, thiet_bi_id, trang_thai_me, ket_qua_test, is_active)
  VALUES ('L4B-CN-' || gen_random_uuid(), v_may, 'DANG_CHUAN_NAP', NULL, true) RETURNING id INTO v_cn;
  v_ok := false;
  BEGIN
    PERFORM public.rpc_cssd_me_thu_hoi(v_cn, 'QC_FAIL', v_actor, v_ns, 'L4B_TEST', 'L4B test', 'L4B ca6 gốc chuẩn nạp');
  EXCEPTION WHEN others THEN
    v_ok := SQLERRM LIKE '%không thu hồi%'; RAISE NOTICE 'ca6 gốc DANG_CHUAN_NAP QC_FAIL → %', SQLERRM;
  END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FAIL ca6: thu hồi mẻ gốc DANG_CHUAN_NAP không bị chặn rõ'; END IF;
  RAISE NOTICE 'PASS ca6: mẻ đang chạy trong cửa sổ không đụng; gốc chưa chạy xong bị chặn';
END $$;
ROLLBACK;

-- Ca 7: THU_HOI → QC_KHONG_DAT bị chặn (UPDATE trực tiếp); thu hồi lại mẻ gốc THU_HOI giữ THU_HOI.
BEGIN;
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
SET LOCAL ROLE service_role;
DO $$
DECLARE
  v_actor uuid := (SELECT ns.auth_user_id FROM public.mdm_nhan_su ns
                   JOIN public.v_sys_user_permissions v ON v.auth_user_id = ns.auth_user_id
                   WHERE ns.is_active AND v.roles ? 'ADMIN' LIMIT 1);
  v_ns uuid; v_id uuid; v_st text; v_ok boolean := false;
BEGIN
  v_ns := (SELECT id FROM public.mdm_nhan_su WHERE auth_user_id = v_actor AND is_active LIMIT 1);
  INSERT INTO public.cssd_fact_lo_tiet_khuan (ma_lo_tiet_khuan, trang_thai_me, ket_qua_test, is_active)
  VALUES ('L4B-TH-' || gen_random_uuid(), 'THU_HOI', true, true) RETURNING id INTO v_id;
  BEGIN
    UPDATE public.cssd_fact_lo_tiet_khuan SET trang_thai_me = 'QC_KHONG_DAT' WHERE id = v_id;
  EXCEPTION WHEN others THEN
    v_ok := SQLERRM LIKE '%từ THU_HOI sang QC_KHONG_DAT%';
  END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FAIL ca7: UPDATE THU_HOI → QC_KHONG_DAT KHÔNG bị chặn'; END IF;
  PERFORM public.rpc_cssd_me_thu_hoi(v_id, 'BI_DUONG', v_actor, v_ns, 'L4B_TEST', 'L4B test', 'L4B ca7');
  SELECT trang_thai_me INTO v_st FROM public.cssd_fact_lo_tiet_khuan WHERE id = v_id;
  IF v_st <> 'THU_HOI' THEN RAISE EXCEPTION 'FAIL ca7: thu hồi lại mẻ THU_HOI → %', v_st; END IF;
  RAISE NOTICE 'PASS ca7: THU_HOI→QC_KHONG_DAT bị chặn; thu hồi lại giữ THU_HOI';
END $$;
ROLLBACK;

-- Ca 8: QC_FAIL mẻ gốc DANG_TIET_KHUAN → QC_KHONG_DAT (gộp S_ME_NGAT→CACH_LY); QC_FAIL mẻ gốc HOAN_THANH → THU_HOI.
BEGIN;
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
SET LOCAL ROLE service_role;
DO $$
DECLARE
  v_actor uuid := (SELECT ns.auth_user_id FROM public.mdm_nhan_su ns
                   JOIN public.v_sys_user_permissions v ON v.auth_user_id = ns.auth_user_id
                   WHERE ns.is_active AND v.roles ? 'ADMIN' LIMIT 1);
  v_ns uuid; v_tk uuid; v_ht uuid; v_st text; v_st2 text;
BEGIN
  v_ns := (SELECT id FROM public.mdm_nhan_su WHERE auth_user_id = v_actor AND is_active LIMIT 1);
  INSERT INTO public.cssd_fact_lo_tiet_khuan (ma_lo_tiet_khuan, trang_thai_me, ket_qua_test, is_active)
  VALUES ('L4B-TKQC-' || gen_random_uuid(), 'DANG_TIET_KHUAN', NULL, true) RETURNING id INTO v_tk;
  INSERT INTO public.cssd_fact_lo_tiet_khuan (ma_lo_tiet_khuan, trang_thai_me, ket_qua_test, is_active)
  VALUES ('L4B-HTQC-' || gen_random_uuid(), 'HOAN_THANH', true, true) RETURNING id INTO v_ht;
  PERFORM public.rpc_cssd_me_thu_hoi(v_tk, 'QC_FAIL', v_actor, v_ns, 'L4B_TEST', 'L4B test', 'L4B ca8 đang chạy');
  PERFORM public.rpc_cssd_me_thu_hoi(v_ht, 'QC_FAIL', v_actor, v_ns, 'L4B_TEST', 'L4B test', 'L4B ca8 đã xuất');
  SELECT trang_thai_me INTO v_st FROM public.cssd_fact_lo_tiet_khuan WHERE id = v_tk;
  SELECT trang_thai_me INTO v_st2 FROM public.cssd_fact_lo_tiet_khuan WHERE id = v_ht;
  IF v_st <> 'QC_KHONG_DAT' OR v_st2 <> 'THU_HOI' THEN
    RAISE EXCEPTION 'FAIL ca8: QC_FAIL DANG_TIET_KHUAN → %, HOAN_THANH → %', v_st, v_st2;
  END IF;
  RAISE NOTICE 'PASS ca8: QC_FAIL đang chạy → QC_KHONG_DAT; đã xuất → THU_HOI';
END $$;
ROLLBACK;
