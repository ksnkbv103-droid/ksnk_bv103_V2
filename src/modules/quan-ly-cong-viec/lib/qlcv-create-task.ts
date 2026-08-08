import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeQlcvDmFields } from "./qlcv-persist-dm-fields";
import { QLCV_FACT_WRITE_TABLE } from "./qlcv-fact-write";
import { throwQlcvDbError } from "./qlcv-supabase-error";
import { resolveQlcvTrangThaiMaForTask } from "./qlcv-initial-trang-thai";
import { validateAssigneeForQlcv } from "./qlcv-ksnk-server";
import { resolveQlcvNhiemVuId } from "./qlcv-nhiem-vu-chain";
import { normalizeQlcvStaffIdList } from "./qlcv-staff-ids";

export type QlcvInsertTaskPayload = {
  tieu_de: string;
  mo_ta?: string | null;
  loai_cong_viec: string;
  muc_do_uu_tien?: string;
  han_hoan_thanh?: string | null;
  nguoi_phu_trach_id?: string | null;
  /** Dùng validate assignee thuộc KSNK — không ghi DB. */
  ksnkKhoaId: string;
  to_cong_tac_id?: string | null;
  vi_tri_thuc_hien?: string | null;
  nguoi_phoi_hop_ids?: string[];
  nguoi_theo_doi_ids?: string[];
  is_active: boolean;
  nguoi_tao_id: string;
  nguoi_giao_viec_id?: string | null;
  dia_diem_khoa_id?: string | null;
  nhiem_vu_id?: string | null;
  analytics_meta?: {
    chi_so?: string | null;
    khoa_id?: string | null;
    ky_do_lai?: string | null;
    gia_tri_luc_tao?: number | null;
  } | null;
};

function qlcvTodayDateStr(): string {
  return new Date(new Date().getTime() + 7 * 60 * 60 * 1000).toISOString().split("T")[0];
}

export function normalizeQlcvHanDate(han: string | null | undefined): string | null {
  if (!han) return null;
  const cleaned = String(han).trim();
  if (!cleaned) return null;
  return cleaned.split("T")[0];
}

/** Tạo mới — hạn không được trước hôm nay. */
export function assertQlcvHanHoanThanhNotPast(han: string | null | undefined): void {
  const norm = normalizeQlcvHanDate(han);
  if (!norm) return;
  if (norm < qlcvTodayDateStr()) {
    throw new Error("Hạn hoàn thành không được trước ngày hôm nay.");
  }
}

/**
 * Sửa / phê duyệt — giữ nguyên hạn cũ (kể cả đã qua); chỉ chặn khi đổi sang ngày mới trước hôm nay.
 */
export function assertQlcvHanHoanThanhChangeAllowed(
  newHan: string | null | undefined,
  oldHan?: string | null | undefined,
): void {
  const newNorm = normalizeQlcvHanDate(newHan);
  const oldNorm = normalizeQlcvHanDate(oldHan);
  if (!newNorm) return;
  if (newNorm === oldNorm) return;
  if (newNorm < qlcvTodayDateStr()) {
    throw new Error("Hạn hoàn thành mới không được trước ngày hôm nay.");
  }
}

/** Kiểm tra FK khoa địa điểm MDM (active). */
export async function assertQlcvDiaDiemKhoaValid(
  supabase: SupabaseClient,
  diaDiemKhoaId: string | null | undefined,
  required: boolean,
): Promise<void> {
  if (!diaDiemKhoaId) {
    if (required) throw new Error("Chọn khoa/đơn vị địa điểm thực hiện (danh mục khoa).");
    return;
  }
  const { data, error } = await supabase
    .from("mdm_dm_khoa_phong")
    .select("id")
    .eq("id", diaDiemKhoaId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throwQlcvDbError(error, "Không kiểm tra khoa địa điểm.");
  if (!data) throw new Error("Khoa/đơn vị địa điểm không hợp lệ hoặc đã ngưng.");
}

/** Insert một dòng qlcv_fact_cong_viec — SSOT tạo việc / đề xuất (nội bộ KSNK). */
export async function insertQlcvTaskRow(
  supabase: SupabaseClient,
  payload: QlcvInsertTaskPayload,
): Promise<Record<string, unknown>> {
  if (!payload.ksnkKhoaId) {
    throw new Error("Thiếu cấu hình khoa KSNK.");
  }
  await assertQlcvDiaDiemKhoaValid(supabase, payload.dia_diem_khoa_id, true);
  const nhiemVuId = await resolveQlcvNhiemVuId(supabase, payload.nhiem_vu_id || null);
  await validateAssigneeForQlcv(supabase, payload.nguoi_phu_trach_id, payload.ksnkKhoaId);
  const phoiHop = normalizeQlcvStaffIdList(payload.nguoi_phoi_hop_ids);
  const theoDoi = normalizeQlcvStaffIdList(payload.nguoi_theo_doi_ids);
  for (const sid of [...phoiHop, ...theoDoi]) {
    await validateAssigneeForQlcv(supabase, sid, payload.ksnkKhoaId);
  }

  const trangThaiMa = resolveQlcvTrangThaiMaForTask({
    isActive: payload.is_active,
    nguoi_phu_trach_id: payload.nguoi_phu_trach_id,
    to_cong_tac_id: payload.to_cong_tac_id,
  });

  const dm = normalizeQlcvDmFields({
    loai_cong_viec: payload.loai_cong_viec,
    trang_thai: trangThaiMa,
  });

  const meta = payload.analytics_meta;
  const analytics_meta =
    meta && (meta.chi_so || meta.khoa_id || meta.ky_do_lai || meta.gia_tri_luc_tao != null)
      ? {
          ...(meta.chi_so ? { chi_so: String(meta.chi_so).trim() } : {}),
          ...(meta.khoa_id ? { khoa_id: String(meta.khoa_id).trim() } : {}),
          ...(meta.ky_do_lai ? { ky_do_lai: String(meta.ky_do_lai).trim() } : {}),
          ...(meta.gia_tri_luc_tao != null && Number.isFinite(meta.gia_tri_luc_tao)
            ? { gia_tri_luc_tao: Number(meta.gia_tri_luc_tao) }
            : {}),
        }
      : {};

  const { data, error } = await supabase
    .from(QLCV_FACT_WRITE_TABLE)
    .insert({
      tieu_de: payload.tieu_de,
      mo_ta: payload.mo_ta ?? null,
      loai_cong_viec: dm.loai_cong_viec,
      muc_do_uu_tien: payload.muc_do_uu_tien || "TRUNG_BINH",
      han_hoan_thanh: payload.han_hoan_thanh || null,
      nguoi_phu_trach_id: payload.nguoi_phu_trach_id || null,
      to_cong_tac_id: payload.to_cong_tac_id || null,
      vi_tri_thuc_hien: payload.vi_tri_thuc_hien?.trim() || null,
      dia_diem_khoa_id: payload.dia_diem_khoa_id || null,
      nhiem_vu_id: nhiemVuId,
      nguoi_phoi_hop_ids: phoiHop,
      nguoi_theo_doi_ids: theoDoi,
      nguoi_tao_id: payload.nguoi_tao_id,
      nguoi_giao_viec_id: payload.nguoi_giao_viec_id ?? payload.nguoi_tao_id,
      trang_thai: dm.trang_thai,
      phan_tram_hoan_thanh: 0,
      is_active: payload.is_active,
      nhat_ky: [],
      analytics_meta,
    })
    .select()
    .single();

  if (error) throwQlcvDbError(error, "Không tạo được công việc.");
  return data as Record<string, unknown>;
}
