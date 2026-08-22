"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyCssdKhoDungCuView } from "@/lib/cssd-server-gates";
import { getErrorMessage } from "../shared/cssd-db-utils";

const MAX_KHO_ROWS = 8000;

async function loadRedAlertKeys(supabase: ReturnType<typeof createAdminSupabaseClient>) {
  const byQuyTrinhId = new Set<string>();
  const byMaQr = new Set<string>();
  const { data } = await supabase
    .from("cssd_fact_su_co")
    .select("quy_trinh_id, ma_qr_quy_trinh")
    .eq("is_red_alert", true)
    .limit(5000);
  for (const row of data || []) {
    const id = String((row as { quy_trinh_id?: string | null }).quy_trinh_id || "").trim();
    const qr = String((row as { ma_qr_quy_trinh?: string | null }).ma_qr_quy_trinh || "")
      .trim()
      .toUpperCase();
    if (id) byQuyTrinhId.add(id);
    if (qr) byMaQr.add(qr);
  }
  return { byQuyTrinhId, byMaQr };
}

export async function fetchCssdKhoDungCuList() {
  try {
    await verifyCssdKhoDungCuView();
    const supabase = createAdminSupabaseClient();
    const { data: res, error } = await supabase
      .from("v_cssd_quy_trinh_full")
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
        .from("cssd_dm_bo_dung_cu")
        .select("*, khoa:mdm_dm_khoa_phong!khoa_su_dung_id(ten_khoa, ma_khoa)")
        .in("id", boIds);
      if (boErr) return { success: false as const, error: boErr.message, data: [] };
      boMap = new Map((bos || []).map((x: { id: string }) => [String(x.id), x as Record<string, unknown>]));
    }

    const redKeys = await loadRedAlertKeys(supabase);

    const qtyByBo = new Map<string, { can: number; thuc: number; thieu: number }>();
    if (boIds.length) {
      const { data: rt } = await supabase
        .from("v_cssd_bo_dung_cu_chi_tiet_realtime")
        .select("bo_dung_cu_id, so_luong_tieu_chuan, so_luong_thuc_te, missing_count")
        .in("bo_dung_cu_id", boIds)
        .eq("is_active", true);
      for (const r of rt || []) {
        const bid = String((r as { bo_dung_cu_id?: string }).bo_dung_cu_id || "").trim();
        if (!bid) continue;
        const prev = qtyByBo.get(bid) || { can: 0, thuc: 0, thieu: 0 };
        prev.can += Number((r as { so_luong_tieu_chuan?: number }).so_luong_tieu_chuan || 0);
        prev.thuc += Number((r as { so_luong_thuc_te?: number }).so_luong_thuc_te || 0);
        prev.thieu += Number((r as { missing_count?: number }).missing_count || 0);
        qtyByBo.set(bid, prev);
      }
    }

    const data = rows.map((x) => {
      const id = String(x.id || "");
      const qr = String(x.ma_qr_quy_trinh || "").trim().toUpperCase();
      const fromSuCo = redKeys.byQuyTrinhId.has(id) || (qr ? redKeys.byMaQr.has(qr) : false);
      const fromRow = x.is_red_alert === true;
      const boId = String(x.bo_dung_cu_id || "").trim();
      const qty = qtyByBo.get(boId) || null;
      return {
        ...x,
        is_red_alert: fromRow || fromSuCo,
        ma_vach_qr: x.ma_qr_quy_trinh || "",
        trang_thai_hien_tai: x.ma_trang_thai_hien_tai || "",
        cssd_dm_bo_dung_cu: x.bo_dung_cu_id ? boMap.get(String(x.bo_dung_cu_id)) || null : null,
        so_luong_can: qty?.can ?? null,
        so_luong_thuc_te: qty?.thuc ?? null,
        so_luong_thieu: qty?.thieu ?? 0,
      };
    });

    return { success: true as const, data };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e), data: [] };
  }
}
