#!/usr/bin/env bash
# Go-live apply order (READ-ONLY) — tip cursor/r3-debate, 2026-10-05.
# Prod watermark: 20261004194907 (gồm 20261004183253_security_p0_rls_cleanup_20261005).
# Không gọi supabase db push / migrate. Chỉ echo thứ tự + rủi ro.
set -euo pipefail

echo "=== GO-LIVE APPLY ORDER (echo only) ==="
echo "Prod applied thru: 20261004194907"
echo "Local pending: version > 20261004194907"
echo ""

echo "--- SKIP-PROD ---"
echo "SKIP-PROD  20261005010000_security_p0_rls_cleanup.sql  THẤP(skip)"
echo "  lý do: trùng nội dung đã apply prod dưới 20261004183253_security_p0_rls_cleanup_20261005"
echo "  đề xuất: archive_legacy/…SKIP-PROD.sql hoặc repair --status applied 20261005010000 (không DROP data)"
echo ""

echo "--- APPLY (thứ tự an toàn) ---"
# version | risk | short reason
rows=(
  "20261005033000_nkbv_fn_major_type_ped_out.sql|THẤP|CREATE OR REPLACE fn taxonomy; không data rewrite"
  "20261005034000_nkbv_doe_loa_report_cols.sql|VỪA|ADD COLUMN + backfill UPDATE + RPC search_path"
  "20261005120000_cssd_incident_status_da_dong.sql|THẤP|COMMENT only (attributes lifecycle)"
  "20261005121000_cssd_heat_split_parent_backfill.sql|CAO|UPDATE catalog parent_bo_id / vai_tro_tach (data rewrite)"
  "20261005130000_cssd_sc_batch_recall_two_phase.sql|CAO|RPC thu hồi 2 pha; SECURITY path + UPDATE quy_trinh/mẻ/su_co"
  "20261005140000_cssd_me01_bi_bm02.sql|VỪA|CHECK trang_thai_bi + REPLACE RPC BI/QC"
  "20261005141000_cssd_me04_nha_implant_perm.sql|VỪA|seed perm + SECURITY DEFINER helpers + RPC nhả"
  "20261005142000_cssd_me02_bowie_dick_events.sql|THẤP|CREATE TABLE + backfill INSERT từ specs"
  "20261005143000_cssd_me03_cho_tham_dinh.sql|THẤP|DROP CHECK máy (mở CHO_THAM_DINH); không data delete"
  "20261005144000_cssd_me10_recall_preserve_qc.sql|CAO|REPLACE rpc_cssd_me_thu_hoi (phụ thuộc 130000); UPDATE path"
  "20261005145000_cssd_me05_hsd_bao_goi.sql|VỪA|bảng HSD + CHECK + seed; RPC HSD"
  "20261005150000_cssd_me07_pp_chi_dinh_gate.sql|VỪA|REPLACE RPC gate PP chỉ định"
  "20261005152000_cssd_me08_chuong_trinh_id.sql|THẤP|ADD COLUMN FK ON DELETE SET NULL"
  "20261005153000_cssd_me09_nguoi_nap_id.sql|THẤP|ADD COLUMN FK ON DELETE SET NULL"
  "20261005154000_sys_admin_audit.sql|THẤP|CREATE TABLE audit insert-only + RLS"
  "20261005154100_adm03_rbac_admin_only.sql|VỪA|DROP/CREATE RLS; SECURITY DEFINER RPC DELETE sys_user_roles"
  "20261005154200_adm04_approve_permissions_seed.sql|THẤP|INSERT/UPSERT sys_permissions approve"
  "20261005160000_gs05_analytics_hinh_thuc_id_stype.sql|VỪA|backfill hinh_thuc_id + view/RPC SECURITY DEFINER"
  "20261005170000_qlcv_mod_today_vn_overdue.sql|VỪA|fn ngày VN + SECURITY DEFINER sync overdue UPDATE"
  "20261005171000_qlcv_mod_transition_gate.sql|VỪA|SECURITY DEFINER transition gate REPLACE"
  "20261005172000_qlcv_mod_loai_dinh_ky_check.sql|CAO|UPDATE rewrite loai + ADD CHECK (fail nếu còn lệch)"
  "20261005173000_qlcv_mod_dinh_ky_spawn.sql|VỪA|ADD COLUMN + SECURITY DEFINER spawn"
  "20261005174000_qlcv_mod_nguon_lien_ket.sql|THẤP|ADD COLUMN jsonb + view"
  "20261005175000_gsc_mod_orphan_tc_and_bk_map.sql|VỪA|seed map orphan + UPDATE resolve id"
  "20261005175100_gsc_mod_loai_filter_orphan_views.sql|VỪA|ADD loai_giam_sat + backfill + view rewrite"
  "20261005175200_gsc_mod_seed_doi_tuong_mec_inactive.sql|VỪA|UPDATE catalog doi_tuong/is_active + soft-delete TC/BK"
  "20261005175300_gsc_mod_orphan_merge_map.sql|VỪA|CREATE merge map + seed UPDATE"
  "20261005180000_vst_mod_soft_delete_save_rpc.sql|VỪA|ADD deleted_* + SECURITY DEFINER save (DELETE opportunities)"
  "20261005181000_vst_mod_valid_opp_analytics.sql|VỪA|SECURITY DEFINER analytics predicate (0 đổi lịch sử nếu dữ liệu sạch)"
  "20261005182000_qlcv_nghiem_thu_no_self_approve.sql|VỪA|SECURITY DEFINER harden self-NT (REPLACE transition)"
)

n=0
for row in "${rows[@]}"; do
  IFS='|' read -r file risk reason <<<"$row"
  n=$((n + 1))
  printf "APPLY %02d  %s  %s\n" "$n" "$file" "$risk"
  echo "         $reason"
done

echo ""
echo "=== SUMMARY ==="
echo "SKIP-PROD: 1"
echo "APPLY:     $n"
echo "CAO:       20261005121000 heat_split_backfill; 20261005130000 sc_batch_recall; 20261005144000 me10_recall; 20261005172000 loai_dinh_ky_check"
echo "Note: không chạy supabase db push từ script này."
