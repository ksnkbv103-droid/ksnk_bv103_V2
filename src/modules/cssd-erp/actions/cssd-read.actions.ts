"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { Station } from "../types/cssd.types";
import { verifyPermission } from "@/lib/server-permission";
import { getErrorMessage, STEPS } from "./cssd-action-common";

export async function getWaitingListByStation(station: Station) {
  const supabase = createAdminSupabaseClient();
  await verifyPermission("CSSD_WORKFLOW", "view");
  /** Trạm TK không có «chờ quét» tại trang 6 bước — vào mẻ chỉ trên /cssd-erp/batch. */
  if (station === "TIET_KHUAN") return [];

  const idx = STEPS.indexOf(station);
  const prevStation = idx === 0 ? "CAP_PHAT" : STEPS[idx - 1];
  const { data, error } = await supabase
    .from("fact_quy_trinh")
    .select("id, ma_qr_quy_trinh, updated_at")
    .eq("ma_trang_thai_hien_tai", prevStation)
    .eq("is_active", true)
    .order("updated_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map((x: { id: string; ma_qr_quy_trinh?: string | null; updated_at?: string | null }) => ({
    id: x.id,
    ma_vach_qr: x.ma_qr_quy_trinh || "",
    updated_at: x.updated_at || "",
  }));
}

/** Giới hạn mỗi lần đọc để tránh tải toàn bộ bảng luồng vào request (AGENTS §5b). */
const MAX_CSSD_IMPORT_EXPORT_ROWS = 8000;

export async function getCSSDImportExportData() {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyPermission("CSSD_KHO_DUNGCU", "view");
    const { data, error } = await supabase
      .from("fact_quy_trinh")
      .select("id, ma_qr_quy_trinh, ma_trang_thai_hien_tai, is_red_alert, tinh_trang, han_su_dung, lo_tiet_khuan_id, is_active, created_at, updated_at")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(MAX_CSSD_IMPORT_EXPORT_ROWS);
    if (error) throw error;
    const mapped = (data || []).map(
      (x: {
        id: string;
        ma_qr_quy_trinh?: string | null;
        ma_trang_thai_hien_tai?: string | null;
        is_red_alert?: boolean | null;
        tinh_trang?: string | null;
        han_su_dung?: string | null;
        lo_tiet_khuan_id?: string | null;
        is_active?: boolean | null;
        created_at?: string | null;
        updated_at?: string | null;
      }) => ({
        id: x.id,
        ma_vach_qr: x.ma_qr_quy_trinh || "",
        trang_thai_hien_tai: x.ma_trang_thai_hien_tai || null,
        is_red_alert: x.is_red_alert === true,
        tinh_trang: x.tinh_trang || null,
        han_su_dung: x.han_su_dung || null,
        lo_tiet_khuan_id: x.lo_tiet_khuan_id || null,
        is_active: x.is_active !== false,
        created_at: x.created_at || null,
        updated_at: x.updated_at || null,
      }),
    );
    return { success: true, data: mapped };
  } catch (error: unknown) { return { success: false, error: getErrorMessage(error) }; }
}
