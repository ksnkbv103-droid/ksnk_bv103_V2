import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeQlcvDmFields } from "./qlcv-persist-dm-fields";
import { QLCV_FACT_WRITE_TABLE } from "./qlcv-fact-write";
import { throwQlcvDbError } from "./qlcv-supabase-error";
import { resolveQlcvTrangThaiMaForTask } from "./qlcv-initial-trang-thai";
import { validateAssigneeForQlcv } from "./qlcv-ksnk-server";

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
  is_active: boolean;
  nguoi_tao_id: string;
  nguoi_giao_viec_id?: string | null;
};

export function qlcvTodayDateStr(): string {
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

/** Insert một dòng qlcv_fact_cong_viec — SSOT tạo việc / đề xuất (nội bộ KSNK). */
export async function insertQlcvTaskRow(
  supabase: SupabaseClient,
  payload: QlcvInsertTaskPayload,
): Promise<Record<string, unknown>> {
  if (!payload.ksnkKhoaId) {
    throw new Error("Thiếu cấu hình khoa KSNK.");
  }
  await validateAssigneeForQlcv(supabase, payload.nguoi_phu_trach_id, payload.ksnkKhoaId);

  const trangThaiMa = resolveQlcvTrangThaiMaForTask({
    isActive: payload.is_active,
    nguoi_phu_trach_id: payload.nguoi_phu_trach_id,
    to_cong_tac_id: payload.to_cong_tac_id,
  });

  const dm = normalizeQlcvDmFields({
    loai_cong_viec: payload.loai_cong_viec,
    trang_thai: trangThaiMa,
  });

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
      nguoi_tao_id: payload.nguoi_tao_id,
      nguoi_giao_viec_id: payload.nguoi_giao_viec_id ?? payload.nguoi_tao_id,
      trang_thai: dm.trang_thai,
      phan_tram_hoan_thanh: 0,
      is_active: payload.is_active,
      nhat_ky: [],
    })
    .select()
    .single();

  if (error) throwQlcvDbError(error, "Không tạo được công việc.");
  return data as Record<string, unknown>;
}
