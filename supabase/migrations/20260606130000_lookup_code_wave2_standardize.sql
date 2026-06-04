-- Wave 2: chuẩn hóa mã lookup còn lại (giữ UUID — FK theo id).
-- Quy ước: {PREFIX}_{SLUG} — PREFIX theo domain (HT, CT, NN, CD, CV, LM, SC, TC).

BEGIN;

-- HINH_THUC_GIAM_SAT
UPDATE public.sys_lookup_value SET code = 'HT_TU_GIAM_SAT', metadata = '{"thu_tu":1}'::jsonb
 WHERE category_type = 'HINH_THUC_GIAM_SAT' AND code = 'DM-0001';
UPDATE public.sys_lookup_value SET code = 'HT_CHUYEN_TRACH', metadata = '{"thu_tu":2}'::jsonb
 WHERE category_type = 'HINH_THUC_GIAM_SAT' AND code = 'DM-0002';
UPDATE public.sys_lookup_value SET code = 'HT_GIAM_SAT_CHEO', metadata = '{"thu_tu":3}'::jsonb
 WHERE category_type = 'HINH_THUC_GIAM_SAT' AND code = 'DM-0003';

-- CACH_THUC_GIAM_SAT
UPDATE public.sys_lookup_value SET code = 'CT_TRUC_TIEP', metadata = '{"thu_tu":1}'::jsonb
 WHERE category_type = 'CACH_THUC_GIAM_SAT' AND code = 'DM-0001';
UPDATE public.sys_lookup_value SET code = 'CT_CAMERA_TRUC_TIEP', metadata = '{"thu_tu":2}'::jsonb
 WHERE category_type = 'CACH_THUC_GIAM_SAT' AND code = 'DM-0002';
UPDATE public.sys_lookup_value SET code = 'CT_CAMERA_LAI', metadata = '{"thu_tu":3}'::jsonb
 WHERE category_type = 'CACH_THUC_GIAM_SAT' AND code = 'DM-0003';

-- NGHE_NGHIEP
UPDATE public.sys_lookup_value SET code = 'NN_BAC_SI', metadata = '{"thu_tu":1}'::jsonb
 WHERE category_type = 'NGHE_NGHIEP' AND code = 'DM-0001';
UPDATE public.sys_lookup_value SET code = 'NN_DIEU_DUONG', metadata = '{"thu_tu":2}'::jsonb
 WHERE category_type = 'NGHE_NGHIEP' AND code = 'DM-0002';
UPDATE public.sys_lookup_value SET code = 'NN_KY_THUAT_VIEN', metadata = '{"thu_tu":3}'::jsonb
 WHERE category_type = 'NGHE_NGHIEP' AND code = 'DM-0003';
UPDATE public.sys_lookup_value SET code = 'NN_HOC_VIEN', metadata = '{"thu_tu":4}'::jsonb
 WHERE category_type = 'NGHE_NGHIEP' AND code = 'DM-0004';
UPDATE public.sys_lookup_value SET code = 'NN_VE_SINH', metadata = '{"thu_tu":5}'::jsonb
 WHERE category_type = 'NGHE_NGHIEP' AND code = 'DM-0005';
UPDATE public.sys_lookup_value SET code = 'NN_CONG_VU', metadata = '{"thu_tu":6}'::jsonb
 WHERE category_type = 'NGHE_NGHIEP' AND code = 'DM-006';

-- CHUC_DANH
UPDATE public.sys_lookup_value SET code = 'CD_TIEN_SI', metadata = '{"thu_tu":1}'::jsonb
 WHERE category_type = 'CHUC_DANH' AND code = 'CD_01';
UPDATE public.sys_lookup_value SET code = 'CD_THAC_SI', metadata = '{"thu_tu":2}'::jsonb
 WHERE category_type = 'CHUC_DANH' AND code = 'CD_02';
UPDATE public.sys_lookup_value SET code = 'CD_PGS', metadata = '{"thu_tu":3}'::jsonb
 WHERE category_type = 'CHUC_DANH' AND code = 'CD_03';
UPDATE public.sys_lookup_value SET code = 'CD_CU_NHAN', metadata = '{"thu_tu":4}'::jsonb
 WHERE category_type = 'CHUC_DANH' AND code = 'CD_04';

-- CHUC_VU
UPDATE public.sys_lookup_value SET code = 'CV_CHU_NHIEM', metadata = '{"thu_tu":1}'::jsonb
 WHERE category_type = 'CHUC_VU' AND code = 'CHUCVU-DEFAULT-01';
UPDATE public.sys_lookup_value SET code = 'CV_PHO_CHU_NHIEM', metadata = '{"thu_tu":2}'::jsonb
 WHERE category_type = 'CHUC_VU' AND code = 'CHUCVU-DEFAULT-02';
UPDATE public.sys_lookup_value SET code = 'CV_DIEU_DUONG_TRUONG', metadata = '{"thu_tu":3}'::jsonb
 WHERE category_type = 'CHUC_VU' AND code = 'CHUCVU-DEFAULT-03';
UPDATE public.sys_lookup_value SET code = 'CV_NHAN_VIEN', metadata = '{"thu_tu":4}'::jsonb
 WHERE category_type = 'CHUC_VU' AND code = 'CHUCVU-DEFAULT-04';

-- LOAI_MAY_TIET_KHUAN
UPDATE public.sys_lookup_value SET code = 'LM_HOI_NUOC', metadata = '{"thu_tu":1}'::jsonb
 WHERE category_type = 'LOAI_MAY_TIET_KHUAN' AND code = 'DM-0001';
UPDATE public.sys_lookup_value SET code = 'LM_PLASMA', metadata = '{"thu_tu":2}'::jsonb
 WHERE category_type = 'LOAI_MAY_TIET_KHUAN' AND code = 'DM-0002';
UPDATE public.sys_lookup_value SET code = 'LM_EO', metadata = '{"thu_tu":3}'::jsonb
 WHERE category_type = 'LOAI_MAY_TIET_KHUAN' AND code = 'DM-0003';
UPDATE public.sys_lookup_value SET code = 'LM_RUA_TU_DONG', metadata = '{"thu_tu":4}'::jsonb
 WHERE category_type = 'LOAI_MAY_TIET_KHUAN' AND code = 'DM-0004';
UPDATE public.sys_lookup_value SET code = 'LM_RUA_SIEU_AM', metadata = '{"thu_tu":5}'::jsonb
 WHERE category_type = 'LOAI_MAY_TIET_KHUAN' AND code = 'DM-0005';
UPDATE public.sys_lookup_value SET code = 'LM_SAY', metadata = '{"thu_tu":6}'::jsonb
 WHERE category_type = 'LOAI_MAY_TIET_KHUAN' AND code = 'DM-0006';

-- LOAI_SU_CO
UPDATE public.sys_lookup_value SET code = 'SC_QUY_TRINH', metadata = '{"thu_tu":1}'::jsonb
 WHERE category_type = 'LOAI_SU_CO' AND code = 'SC-001';
UPDATE public.sys_lookup_value SET code = 'SC_CHU_QUAN', metadata = '{"thu_tu":2}'::jsonb
 WHERE category_type = 'LOAI_SU_CO' AND code = 'SC-002';
UPDATE public.sys_lookup_value SET code = 'SC_HE_THONG', metadata = '{"thu_tu":3}'::jsonb
 WHERE category_type = 'LOAI_SU_CO' AND code = 'SC-003';

-- TO_CONG_TAC
UPDATE public.sys_lookup_value SET code = 'TC_CHI_HUY', metadata = '{"thu_tu":1}'::jsonb
 WHERE category_type = 'TO_CONG_TAC' AND code = 'KSNK_Fr_3';
UPDATE public.sys_lookup_value SET code = 'TC_CSSD', metadata = '{"thu_tu":2}'::jsonb
 WHERE category_type = 'TO_CONG_TAC' AND code = 'KSNK_Gr_1';
UPDATE public.sys_lookup_value SET code = 'TC_GIAM_SAT', metadata = '{"thu_tu":3}'::jsonb
 WHERE category_type = 'TO_CONG_TAC' AND code = 'KSNK_Gr_2';
UPDATE public.sys_lookup_value SET code = 'TC_DO_VAI', metadata = '{"thu_tu":4}'::jsonb
 WHERE category_type = 'TO_CONG_TAC' AND code = 'KSNK_Gr_4';
UPDATE public.sys_lookup_value SET code = 'TC_QUAN_LY_KHO', metadata = '{"thu_tu":5}'::jsonb
 WHERE category_type = 'TO_CONG_TAC' AND code = 'KSNK_Gr_5';
UPDATE public.sys_lookup_value SET code = 'TC_CHAT_THAI', metadata = '{"thu_tu":6}'::jsonb
 WHERE category_type = 'TO_CONG_TAC' AND code = 'KSNK_Gr_6';

COMMIT;
