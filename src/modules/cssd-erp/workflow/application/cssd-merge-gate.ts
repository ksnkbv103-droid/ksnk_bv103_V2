import type { SupabaseClient } from "@supabase/supabase-js";
import type { Station } from "../../types/cssd.types";

/**
 * MAIN có SUB (tách mã): SUB phải đã CAP_PHAT trước khi MAIN TIET_KHUAN → CAP_PHAT.
 */
export async function assertMergeGateForCapPhat(
  supabase: SupabaseClient,
  mainQuyTrinhRow: {
    id: string;
    ma_trang_thai_hien_tai?: string | null;
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const mainId = String(mainQuyTrinhRow.id || "").trim();
  if (!mainId) return { ok: false, message: "Thiếu định danh quy trình." };

  const { data: children, error } = await supabase
    .from("fact_quy_trinh")
    .select("id, ma_qr_quy_trinh, ma_trang_thai_hien_tai, ma_vai_tro_bo")
    .eq("quy_trinh_cha_id", mainId)
    .eq("is_active", true);
  if (error) {
    const msg = String(error.message || "");
    if (/quy_trinh_cha_id|ma_vai_tro_bo|does not exist/i.test(msg)) return { ok: true };
    return { ok: false, message: msg };
  }

  const subs = (children || []).filter((c: { ma_vai_tro_bo?: string | null }) => String(c.ma_vai_tro_bo || "") === "SUB");
  if (!subs.length) return { ok: true };

  const blocking = subs.filter((s: { ma_trang_thai_hien_tai?: string | null }) => {
    const st = String(s.ma_trang_thai_hien_tai || "").trim() as Station;
    return st !== "CAP_PHAT";
  });
  if (!blocking.length) return { ok: true };

  const codes = blocking.map((b: { ma_qr_quy_trinh?: string | null }) => String(b.ma_qr_quy_trinh || "").trim()).filter(Boolean);
  return {
    ok: false,
    message:
      `Cảnh báo hội quân (merge): bộ còn ${blocking.length} kiện phụ chưa ở Cấp phát. QR phụ: ${codes.join(", ") || "—"}.`,
  };
}
