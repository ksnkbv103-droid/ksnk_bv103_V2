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
