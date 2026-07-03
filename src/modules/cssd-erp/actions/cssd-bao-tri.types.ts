/** Types bảo trì thiết bị CSSD. Tách khỏi action vì Next.js 16 cấm `"use server"` file export type. */

import type { CssdPmChecklistItem } from "@/lib/domain/cssd-equipment-pm-checklist";

export type LoaiPhieuBaoTri = "DINH_KY" | "SUA_CHUA";

export type FactBaoTriRow = {
  id: string;
  ma_phieu: string;
  thiet_bi_id: string;
  trang_thai: string;
  loai_phieu: LoaiPhieuBaoTri;
  ly_do: string | null;
  ket_qua_ghi_nhan: string | null;
  checklist_jsonb: CssdPmChecklistItem[];
  su_co_id: string | null;
  thoi_gian_bat_dau: string | null;
  thoi_gian_ket_thuc: string | null;
  ten_thiet_bi?: string | null;
  loai_thiet_bi?: string | null;
};

export type SuCoEquipmentRow = {
  id: string;
  mo_ta: string | null;
  incident_type_label: string | null;
  thiet_bi_id: string | null;
  ma_thiet_bi: string | null;
  ten_thiet_bi: string | null;
  created_at: string;
};
