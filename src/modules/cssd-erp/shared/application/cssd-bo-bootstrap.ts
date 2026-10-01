import type { SupabaseClient } from "@supabase/supabase-js";
import { isCssdUnifiedBoMa, normalizeBoMa } from "@/lib/domain/cssd-bo-ma";
import { mapFkError } from "../../actions/cssd-action-common";
import { appendQuyTrinhException } from "./cssd-quy-trinh-exceptions";

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

export type CssdBoBootstrapRow = {
  id?: string | null;
  is_active?: boolean | null;
  suds_count?: number | null;
};

export type CssdBoBootstrapPlan =
  | { kind: "SYNC_ACTIVE"; id: string }
  | { kind: "NEW_CYCLE"; previousId: string | null; sudsCount: number | null };

/**
 * W4 (S-E): chỉ đồng bộ mã trên chu kỳ còn active. Chu kỳ đã đóng (MAT / thu hồi / đã thay)
 * không bao giờ bật lại `is_active` — mở chu kỳ shell mới (tram=null, tinh_trang mặc định DB),
 * `suds_count` = cũ + 1 như nhánh chu kỳ mới của RPC quét / thu hồi mẻ.
 * `row` = dòng mới nhất ưu tiên active (order is_active desc, created_at desc).
 */
export function planCssdBoBootstrap(row: CssdBoBootstrapRow | null | undefined): CssdBoBootstrapPlan {
  const id = String(row?.id || "").trim();
  if (!id) return { kind: "NEW_CYCLE", previousId: null, sudsCount: null };
  if (row?.is_active === true) return { kind: "SYNC_ACTIVE", id };
  return { kind: "NEW_CYCLE", previousId: id, sudsCount: Number(row?.suds_count || 0) + 1 };
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

  const { data: latest, error: latestErr } = await supabase
    .from("cssd_fact_quy_trinh")
    .select("id, is_active, suds_count")
    .eq("bo_dung_cu_id", id)
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestErr) throw new Error(mapFkError(latestErr.message));

  const plan = planCssdBoBootstrap(latest as CssdBoBootstrapRow | null);
  const now = new Date().toISOString();
  const syncPatch = { ma_qr_quy_trinh: ma_vach_qr, ma_qr_bo_vinh_vien: ma_vach_qr, updated_at: now };

  if (plan.kind === "SYNC_ACTIVE") {
    const { error: upErr } = await supabase
      .from("cssd_fact_quy_trinh")
      .update(syncPatch)
      .eq("id", plan.id)
      .eq("is_active", true);
    if (upErr) throw new Error(mapFkError(upErr.message));
  } else {
    /** Shell — chưa gán trạm; lần quét TIEP_NHAN đầu (RPC) mới ghi tram + audit. */
    const insertRow: Record<string, unknown> = { ...syncPatch, bo_dung_cu_id: id, is_active: true };
    if (plan.sudsCount != null) insertRow.suds_count = plan.sudsCount;
    const { data: created, error: insErr } = await supabase
      .from("cssd_fact_quy_trinh")
      .insert(insertRow)
      .select("id")
      .single();
    if (insErr) throw new Error(mapFkError(insErr.message));
    if (plan.previousId && created?.id) {
      await appendQuyTrinhException(supabase, String(created.id), {
        su_kien: "CHU_KY_MOI_SAU_DONG",
        ly_do: "Chu kỳ trước đã đóng (không bật lại) — mở chu kỳ mới để tiếp nhận.",
        nguoi_thao_tac: "Hệ thống",
        chi_tiet: { quy_trinh_truoc_id: plan.previousId },
      });
    }
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
      `Không tìm thấy bộ "${maBo}" trong danh mục bộ dụng cụ. Kiểm tra Quản trị danh mục → Bộ dụng cụ (không phải danh mục dụng cụ lẻ).`,
    );
  }

  return bootstrapCssdQuyTrinhFromBoId(supabase, String(bo.id));
}
