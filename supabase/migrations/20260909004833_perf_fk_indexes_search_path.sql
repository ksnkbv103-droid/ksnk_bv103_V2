-- Nợ PERF còn lại: index FK nóng + khóa search_path 15 hàm.
-- Không DROP index “chưa dùng”, không gộp policy RLS.

CREATE INDEX IF NOT EXISTS idx_cssd_kho_gd_bo ON public.cssd_fact_kho_giao_dich (bo_dung_cu_id);
CREATE INDEX IF NOT EXISTS idx_cssd_kho_gd_loai ON public.cssd_fact_kho_giao_dich (loai_dung_cu_id);
CREATE INDEX IF NOT EXISTS idx_cssd_kho_gd_qt ON public.cssd_fact_kho_giao_dich (quy_trinh_id);
CREATE INDEX IF NOT EXISTS idx_cssd_kho_gd_nguoi ON public.cssd_fact_kho_giao_dich (nguoi_thuc_hien_id);

CREATE INDEX IF NOT EXISTS idx_cssd_bao_tri_nguoi ON public.cssd_fact_bao_tri (nguoi_thuc_hien_id);
CREATE INDEX IF NOT EXISTS idx_cssd_bao_tri_su_co ON public.cssd_fact_bao_tri (su_co_id);

CREATE INDEX IF NOT EXISTS idx_cssd_tb_loai_may ON public.cssd_dm_thiet_bi (loai_may_id);
CREATE INDEX IF NOT EXISTS idx_cssd_lo_loai_may ON public.cssd_fact_lo_tiet_khuan (loai_may_id);
CREATE INDEX IF NOT EXISTS idx_cssd_lo_nguoi_vh ON public.cssd_fact_lo_tiet_khuan (nguoi_van_hanh_id);
CREATE INDEX IF NOT EXISTS idx_cssd_qt_bom_kiem ON public.cssd_fact_quy_trinh (bom_kiem_dem_boi_id);
CREATE INDEX IF NOT EXISTS idx_cssd_bo_phan_khoa ON public.cssd_dm_bo_phan_bo (khoa_phong_id);

CREATE INDEX IF NOT EXISTS idx_cssd_su_co_loai ON public.cssd_fact_su_co (loai_su_co_id);
CREATE INDEX IF NOT EXISTS idx_cssd_su_co_nguoi_bao ON public.cssd_fact_su_co (nguoi_bao_id);
CREATE INDEX IF NOT EXISTS idx_cssd_su_co_nguoi_xn ON public.cssd_fact_su_co (nguoi_xac_nhan_id);

CREATE INDEX IF NOT EXISTS idx_nkbv_sk_khoa ON public.nkbv_fact_su_kien (khoa_ghi_nhan_id);
CREATE INDEX IF NOT EXISTS idx_nkbv_sk_loai ON public.nkbv_fact_su_kien (loai_nkbv_id);
CREATE INDEX IF NOT EXISTS idx_nkbv_sk_nguoi ON public.nkbv_fact_su_kien (nguoi_ghi_id);
CREATE INDEX IF NOT EXISTS idx_nkbv_sk_trang_thai ON public.nkbv_fact_su_kien (trang_thai_id);
CREATE INDEX IF NOT EXISTS idx_nkbv_sk_vs ON public.nkbv_fact_su_kien (vi_sinh_record_id);
CREATE INDEX IF NOT EXISTS idx_nkbv_sk_lo_tk ON public.nkbv_fact_su_kien (lo_tiet_khuan_id);
CREATE INDEX IF NOT EXISTS idx_nkbv_labid_vs ON public.nkbv_fact_labid_event (vi_sinh_id);
CREATE INDEX IF NOT EXISTS idx_nkbv_vs_khoa_yc ON public.nkbv_fact_vi_sinh (khoa_yeu_cau_id);

CREATE INDEX IF NOT EXISTS idx_qlcv_cv_to ON public.qlcv_fact_cong_viec (to_cong_tac_id);
CREATE INDEX IF NOT EXISTS idx_qlcv_dk_nv ON public.qlcv_fact_cong_viec_dinh_ky (nhiem_vu_id);
CREATE INDEX IF NOT EXISTS idx_qlcv_dk_nguoi_pt ON public.qlcv_fact_cong_viec_dinh_ky (nguoi_phu_trach_id);
CREATE INDEX IF NOT EXISTS idx_qlcv_dk_nguoi_tao ON public.qlcv_fact_cong_viec_dinh_ky (nguoi_tao_id);
CREATE INDEX IF NOT EXISTS idx_qlcv_dk_to ON public.qlcv_fact_cong_viec_dinh_ky (to_cong_tac_id);
CREATE INDEX IF NOT EXISTS idx_qlcv_nv_chu_tri ON public.qlcv_fact_nhiem_vu (nguoi_chu_tri_id);
CREATE INDEX IF NOT EXISTS idx_qlcv_nv_nguoi_tao ON public.qlcv_fact_nhiem_vu (nguoi_tao_id);

CREATE INDEX IF NOT EXISTS idx_ksnk_kpi_khoa ON public.ksnk_dm_muc_tieu_kpi (khoa_id);

ALTER FUNCTION public.block_writes_for_migrated_danh_muc() SET search_path TO public;
ALTER FUNCTION public.bv103_norm_label(text) SET search_path TO public;
ALTER FUNCTION public.fn_cssd_check_set_heat_resistance(uuid) SET search_path TO public;
ALTER FUNCTION public.fn_get_session_stype(uuid, uuid) SET search_path TO public;
ALTER FUNCTION public.fn_gstt_failure_reason_touch_updated_at() SET search_path TO public;
ALTER FUNCTION public.fn_nkbv_dich_te_hoc_rates(date, date, uuid) SET search_path TO public;
ALTER FUNCTION public.fn_nkbv_major_type_from_classification(text) SET search_path TO public;
ALTER FUNCTION public.fn_nkbv_norm_vi_sinh_id(text) SET search_path TO public;
ALTER FUNCTION public.fn_nkbv_ssi_rates_by_surgery(date, date) SET search_path TO public;
ALTER FUNCTION public.fn_qlcv_mo_ta_to_checklist(text) SET search_path TO public;
ALTER FUNCTION public.fn_sync_dashboard_pre_aggregates() SET search_path TO public;
ALTER FUNCTION public.fn_sys_attach_admin_rls(regclass, text) SET search_path TO public;
ALTER FUNCTION public.mdm_refresh_governance_suggestions() SET search_path TO public;
ALTER FUNCTION public.touch_updated_at_mdm_registry() SET search_path TO public;
ALTER FUNCTION public.update_updated_at_column() SET search_path TO public;
