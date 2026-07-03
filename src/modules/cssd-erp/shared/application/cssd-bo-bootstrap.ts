import type { SupabaseClient } from "@supabase/supabase-js";
import { isCssdUnifiedBoMa, normalizeBoMa } from "@/lib/domain/cssd-bo-ma";
import { mapFkError } from "../../actions/cssd-action-common";

/** SSOT guard — ma_bo phải đúng format KHOA.SET.NN trước khi vào workflow. */
export function assertUnifiedBoMaFromRow(bo: { ma_bo?: string | null }): string {
  const ma = normalizeBoMa(bo.ma_bo);
  if (!ma) {
    throw new Error("Bộ dụng cụ chưa có mã bộ (ma_bo). Cập nhật danh mục bộ trước khi quét.");
  }
  if (!isCssdUnifiedBoMa(ma)) {
    throw new Error(
      `Mã bộ "${ma}" chưa đúng chuẩn (vd. B01.SET.01). Chọn khoa và lưu lại danh mục bộ để sinh mã tự động.`,
    );
  }
  return ma;
}

/**
 * Tạo/cập nhật quy_trinh active cho bộ danh mục — ma_qr = ma_bo (SSOT).
 * Không dùng cho dụng cụ lẻ / mã DM-xxxx (danh mục chi tiết).
 */
export async function bootstrapCssdQuyTrinhFromBoId(
  supabase: SupabaseClient,
  boId: string,
): Promise<{ ma_vach_qr: string; ten_bo: string; bo_id: string }> {
  const id = String(boId || "").trim();
  if (!id) throw new Error("Thiếu bộ dụng cụ (danh mục bộ).");

  const { data: bo, error: boErr } = await supabase
    .from("cssd_dm_bo_dung_cu")
    .select("id, ten_bo, ma_bo")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  if (boErr) throw new Error(mapFkError(boErr.message));
  if (!bo) throw new Error("Không tìm thấy bộ dụng cụ hoạt động trong danh mục bộ.");

  const ma_vach_qr = assertUnifiedBoMaFromRow(bo as { ma_bo?: string | null });

  const { data: existing, error: existingErr } = await supabase
    .from("cssd_fact_quy_trinh")
    .select("id")
    .eq("bo_dung_cu_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingErr) throw new Error(mapFkError(existingErr.message));

  const syncPatch = {
    ma_qr_quy_trinh: ma_vach_qr,
    ma_qr_bo_vinh_vien: ma_vach_qr,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error: upErr } = await supabase
      .from("cssd_fact_quy_trinh")
      .update(syncPatch)
      .eq("id", String(existing.id));
    if (upErr) throw new Error(mapFkError(upErr.message));
  } else {
    /** Shell — chưa gán trạm; lần quét TIEP_NHAN đầu (RPC) mới ghi tram + audit. */
    const { error: insErr } = await supabase.from("cssd_fact_quy_trinh").insert({
      ...syncPatch,
      bo_dung_cu_id: id,
    });
    if (insErr) throw new Error(mapFkError(insErr.message));
  }

  return {
    ma_vach_qr,
    ten_bo: String((bo as { ten_bo?: string }).ten_bo || "").trim() || "Bộ dụng cụ",
    bo_id: id,
  };
}

/** Tra cứu bộ theo ma_bo (không nhầm với mã DM-xxxx dụng cụ chi tiết). */
export async function bootstrapCssdQuyTrinhFromMaBo(
  supabase: SupabaseClient,
  rawMaBo: string,
): Promise<{ ma_vach_qr: string; ten_bo: string; bo_id: string }> {
  const maBo = normalizeBoMa(rawMaBo);
  if (!isCssdUnifiedBoMa(maBo)) {
    throw new Error(
      `Mã "${maBo}" không phải mã bộ chuẩn (KHOA.SET.NN). Dụng cụ chi tiết dùng mã DM-xxxx — quét mã bộ trên tem.`,
    );
  }

  const { data: bo, error: boErr } = await supabase
    .from("cssd_dm_bo_dung_cu")
    .select("id")
    .eq("ma_bo", maBo)
    .eq("is_active", true)
    .maybeSingle();
  if (boErr) throw new Error(mapFkError(boErr.message));
  if (!bo?.id) {
    throw new Error(
      `Không tìm thấy bộ "${maBo}" trong danh mục bộ dụng cụ. Kiểm tra MDM → Bộ dụng cụ (không phải danh mục dụng cụ lẻ).`,
    );
  }

  return bootstrapCssdQuyTrinhFromBoId(supabase, String(bo.id));
}
