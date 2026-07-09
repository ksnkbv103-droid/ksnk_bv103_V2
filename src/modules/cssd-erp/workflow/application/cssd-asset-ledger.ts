import type { SupabaseClient } from "@supabase/supabase-js";
import {
  readQuyTrinhBomContext,
} from "../../shared/application/cssd-quy-trinh-bom";

export type { QuyTrinhBomLine as ThanhPhanRow } from "../../shared/domain/cssd-quy-trinh-bom";

/** Kiểm tra cấu phần trước cấp phát — soft warning từ view realtime (Q2). */
export type LedgerCapPhatResult =
  | { ok: true }
  | { ok: true; warning: string }
  | { ok: false; message: string };

export async function assertLedgerDuChoCapPhat(
  supabase: SupabaseClient,
  quyTrinhId: string,
): Promise<LedgerCapPhatResult> {
  const id = String(quyTrinhId || "").trim();
  if (!id) return { ok: false, message: "Thiếu quy_trinh_id." };

  const ctx = await readQuyTrinhBomContext(supabase, id);
  if (!ctx.ok) return { ok: false, message: ctx.message };

  const boId = String(ctx.row.bo_dung_cu_id || "").trim();
  if (!boId) return { ok: false, message: "Quy trình chưa gán bộ dụng cụ — không thể kiểm tra cấu phần." };

  const { data: rows, error } = await supabase
    .from("v_cssd_bo_dung_cu_chi_tiet_realtime")
    .select("ten_loai_dung_cu, so_luong_tieu_chuan, so_luong_thuc_te, is_missing, missing_count")
    .eq("bo_dung_cu_id", boId)
    .eq("is_active", true);

  if (error) return { ok: false, message: error.message };

  const missing = (rows || []).filter((r) => (r as { is_missing?: boolean }).is_missing === true);
  if (!missing.length) return { ok: true };

  const summary = missing
    .map((r) => {
      const row = r as {
        ten_loai_dung_cu?: string;
        missing_count?: number;
        so_luong_thuc_te?: number;
        so_luong_tieu_chuan?: number;
      };
      const ten = String(row.ten_loai_dung_cu || "—");
      const thieu = Number(row.missing_count ?? 0) || Math.max(
        0,
        Number(row.so_luong_tieu_chuan ?? 0) - Number(row.so_luong_thuc_te ?? 0),
      );
      return `${ten} (thiếu ${thieu})`;
    })
    .join(", ");

  return {
    ok: true,
    warning: `Thiếu cấu phần so với thiết kế: ${summary}.`,
  };
}
