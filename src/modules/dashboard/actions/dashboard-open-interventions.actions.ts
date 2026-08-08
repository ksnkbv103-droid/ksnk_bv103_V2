"use server";

import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyCommandCenterShell } from "../lib/dashboard-command-center-access";

export type OpenInterventionRow = {
  id: string;
  tieu_de: string;
  chi_so: string;
  ky_do_lai: string | null;
  khoa_id: string | null;
  gia_tri_luc_tao: number | null;
  trang_thai: string;
  han_hoan_thanh: string | null;
  /** true khi hôm nay >= ky_do_lai — đến hạn đo lại. */
  den_han_do_lai: boolean;
};

const CLOSED = new Set(["HOAN_THANH", "HUY", "TU_CHOI", "DONG"]);

/**
 * Việc QLCV mở có analytics_meta (PDCA) — soft-fail nếu thiếu cột / quyền.
 */
export async function fetchOpenAnalyticsInterventions(limit = 8): Promise<{
  available: boolean;
  rows: OpenInterventionRow[];
}> {
  try {
    await verifyCommandCenterShell();
    const supabase = await createServerSupabaseUserClient();
    const { data, error } = await supabase
      .from("qlcv_fact_cong_viec")
      .select("id, tieu_de, trang_thai, han_hoan_thanh, analytics_meta, is_active")
      .eq("is_active", true)
      .not("analytics_meta", "eq", "{}")
      .order("updated_at", { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 20));

    if (error) {
      // Cột chưa migrate / quyền — soft-fail.
      return { available: false, rows: [] };
    }

    const today = new Date().toISOString().slice(0, 10);
    const rows: OpenInterventionRow[] = [];
    for (const raw of data || []) {
      const r = raw as Record<string, unknown>;
      const st = String(r.trang_thai || "").toUpperCase();
      if (CLOSED.has(st)) continue;
      const meta = (r.analytics_meta as Record<string, unknown>) || {};
      const chiSo = String(meta.chi_so || "").trim();
      if (!chiSo) continue;
      const ky = meta.ky_do_lai ? String(meta.ky_do_lai).slice(0, 10) : null;
      const gvRaw = meta.gia_tri_luc_tao;
      const giaTri =
        gvRaw != null && Number.isFinite(Number(gvRaw)) ? Number(gvRaw) : null;
      rows.push({
        id: String(r.id),
        tieu_de: String(r.tieu_de || "—"),
        chi_so: chiSo,
        ky_do_lai: ky,
        khoa_id: meta.khoa_id ? String(meta.khoa_id) : null,
        gia_tri_luc_tao: giaTri,
        trang_thai: st,
        han_hoan_thanh: r.han_hoan_thanh ? String(r.han_hoan_thanh).slice(0, 10) : null,
        den_han_do_lai: Boolean(ky && ky <= today),
      });
    }
    return { available: true, rows };
  } catch {
    return { available: false, rows: [] };
  }
}
