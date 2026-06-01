"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyCssdKhoDungCuView } from "@/lib/cssd-server-gates";
import { getErrorMessage } from "../shared/cssd-db-utils";

const MAX_HISTORY_ROWS = 50;

export async function fetchCssdKhoGiaoDichHistory() {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyCssdKhoDungCuView();
    const { data: rows, error } = await supabase
      .from("cssd_fact_kho_giao_dich")
      .select(
        "id, loai_giao_dich, ghi_chu, so_luong_thay_doi, bo_dung_cu_id, loai_dung_cu_id, quy_trinh_id, created_at",
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(MAX_HISTORY_ROWS);
    if (error) return { success: false as const, error: error.message, data: [] as unknown[] };

    const boIds = [
      ...new Set((rows || []).map((r) => String(r.bo_dung_cu_id || "").trim()).filter(Boolean)),
    ];
    let boMap = new Map<string, { ma_bo: string; ten_bo: string }>();
    if (boIds.length) {
      const { data: bos } = await supabase.from("dm_bo_dung_cu").select("id, ma_bo, ten_bo").in("id", boIds);
      boMap = new Map(
        (bos || []).map((b: { id: string; ma_bo?: string | null; ten_bo?: string | null }) => [
          String(b.id),
          { ma_bo: String(b.ma_bo || ""), ten_bo: String(b.ten_bo || "") },
        ]),
      );
    }

    const loaiIds = [
      ...new Set((rows || []).map((r) => String(r.loai_dung_cu_id || "").trim()).filter(Boolean)),
    ];
    let loaiMap = new Map<string, { ma_loai_dung_cu: string; ten_loai_dung_cu: string }>();
    if (loaiIds.length) {
      const { data: loais } = await supabase
        .from("dm_loai_dung_cu")
        .select("id, ma_loai_dung_cu, ten_loai_dung_cu")
        .in("id", loaiIds);
      loaiMap = new Map(
        (loais || []).map(
          (l: { id: string; ma_loai_dung_cu?: string | null; ten_loai_dung_cu?: string | null }) => [
            String(l.id),
            {
              ma_loai_dung_cu: String(l.ma_loai_dung_cu || ""),
              ten_loai_dung_cu: String(l.ten_loai_dung_cu || ""),
            },
          ],
        ),
      );
    }

    const data = (rows || []).map((r) => {
      const boId = String(r.bo_dung_cu_id || "").trim();
      const loaiId = String(r.loai_dung_cu_id || "").trim();
      return {
        ...r,
        dm_bo_dung_cu: boId ? boMap.get(boId) ?? null : null,
        dm_loai_dung_cu: loaiId ? loaiMap.get(loaiId) ?? null : null,
      };
    });

    return { success: true as const, data };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e), data: [] };
  }
}
