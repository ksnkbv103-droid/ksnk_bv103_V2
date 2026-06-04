import type { SupabaseClient } from "@supabase/supabase-js";
import { CSSD_ROUTES } from "@/lib/cssd-routes";

export type CssdQuyTrinhLink = {
  quy_trinh_id: string;
  lo_tiet_khuan_id: string | null;
  ma_qr: string;
  ten_bo: string | null;
};

/** Resolve mã QR chu trình CSSD → quy trình active (SSOT read). */
export async function resolveCssdQuyTrinhLinkFromMaQr(
  supabase: SupabaseClient,
  maQrRaw: string,
): Promise<CssdQuyTrinhLink | null> {
  const ma_qr = String(maQrRaw || "").trim().toUpperCase();
  if (!ma_qr) return null;

  const { data, error } = await supabase
    .from("v_cssd_quy_trinh_full")
    .select("id, ma_qr_quy_trinh, lo_tiet_khuan_id, ten_bo")
    .eq("ma_qr_quy_trinh", ma_qr)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) return null;

  return {
    quy_trinh_id: String(data.id),
    lo_tiet_khuan_id: data.lo_tiet_khuan_id ? String(data.lo_tiet_khuan_id) : null,
    ma_qr: String(data.ma_qr_quy_trinh || ma_qr),
    ten_bo: data.ten_bo != null ? String(data.ten_bo) : null,
  };
}

export function cssdTraceUrlFromMaQr(maQr: string): string {
  const code = String(maQr || "").trim().toUpperCase();
  if (!code) return CSSD_ROUTES.quyTrinh;
  return `${CSSD_ROUTES.quyTrinh}?tab=trace&qr=${encodeURIComponent(code)}`;
}
