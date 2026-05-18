"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyCssdKhoDungCuView } from "@/lib/cssd-server-gates";
import { getErrorMessage } from "../shared/cssd-db-utils";

const MAX_KHO_ROWS = 8000;

export async function fetchCssdKhoDungCuList() {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyCssdKhoDungCuView();
    const { data: res, error } = await supabase
      .from("v_fact_quy_trinh_full")
      .select("*")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(MAX_KHO_ROWS);
    if (error) return { success: false as const, error: error.message, data: [] as unknown[] };

    const rows = (res || []) as Array<Record<string, unknown>>;
    const boIds = [...new Set(rows.map((x) => String(x.bo_dung_cu_id || "").trim()).filter(Boolean))];
    let boMap = new Map<string, Record<string, unknown>>();
    if (boIds.length) {
      const { data: bos, error: boErr } = await supabase
        .from("dm_bo_dung_cu")
        .select("*, khoa:dm_khoa_phong!khoa_su_dung_id(ten_khoa)")
        .in("id", boIds);
      if (boErr) return { success: false as const, error: boErr.message, data: [] };
      boMap = new Map((bos || []).map((x: { id: string }) => [String(x.id), x as Record<string, unknown>]));
    }

    const data = rows.map((x) => ({
      ...x,
      ma_vach_qr: x.ma_qr_quy_trinh || "",
      trang_thai_hien_tai: x.ma_trang_thai_hien_tai || "",
      dm_bo_dung_cu: x.bo_dung_cu_id ? boMap.get(String(x.bo_dung_cu_id)) || null : null,
    }));

    return { success: true as const, data };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e), data: [] };
  }
}
