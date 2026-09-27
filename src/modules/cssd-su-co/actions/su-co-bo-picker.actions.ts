"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { passesScPickerWhitelist } from "../domain/cssd-used-clinically";

/** Danh sách bộ đang hoạt động — picker điều chuyển dụng cụ (catalog). */
export async function listActiveBoForInstrumentTransferAction(search?: string) {
  await verifyPermission("BAO_SU_CO", "view");
  const supabase = createAdminSupabaseClient();
  let q = supabase
    .from("cssd_dm_bo_dung_cu")
    .select("id, ten_bo, ma_bo")
    .eq("is_active", true)
    .order("ma_bo", { ascending: true })
    .limit(200);

  const term = String(search || "").trim();
  if (term) {
    q = q.or(`ma_bo.ilike.%${term}%,ten_bo.ilike.%${term}%`);
  }

  const { data, error } = await q;
  if (error) return { success: false as const, error: error.message };
  return {
    success: true as const,
    data: (data || []).map((r) => ({
      id: String(r.id || ""),
      ten_bo: String(r.ten_bo || "").trim() || "—",
      ma_bo: r.ma_bo != null ? String(r.ma_bo).trim() : "",
    })).filter((x) => x.id && x.ma_bo),
  };
}

/**
 * SC picker §17.3 / Domain 23: chu trình mở ∧ tram ∈ 6 ∧ ¬used_clinically.
 * Không dùng catalog thuần (G-P0-03). Luân chuyển vẫn dùng listActiveBoForInstrumentTransferAction.
 */
export async function listBoForSuCoPickerAction(search?: string) {
  await verifyPermission("BAO_SU_CO", "view");
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("cssd_fact_quy_trinh")
    .select(
      "id, is_active, metadata, ma_qr_quy_trinh, ma_cycle_qr, ma_qr_bo_vinh_vien, bo_dung_cu_id, tram:cssd_dm_tram!tram_hien_tai_id(ma_tram), bo:cssd_dm_bo_dung_cu!bo_dung_cu_id(id, ma_bo, ten_bo)",
    )
    .eq("is_active", true)
    .limit(500);
  if (error) return { success: false as const, error: error.message };

  const term = String(search || "").trim().toUpperCase();
  const seen = new Set<string>();
  const rows: { id: string; ten_bo: string; ma_bo: string }[] = [];

  for (const raw of data || []) {
    const r = raw as {
      id?: string;
      is_active?: boolean;
      metadata?: unknown;
      ma_qr_quy_trinh?: string | null;
      ma_cycle_qr?: string | null;
      ma_qr_bo_vinh_vien?: string | null;
      tram?: { ma_tram?: string | null } | { ma_tram?: string | null }[] | null;
      bo?:
        | { id?: string; ma_bo?: string | null; ten_bo?: string | null }
        | { id?: string; ma_bo?: string | null; ten_bo?: string | null }[]
        | null;
    };
    const tramObj = Array.isArray(r.tram) ? r.tram[0] : r.tram;
    const boObj = Array.isArray(r.bo) ? r.bo[0] : r.bo;
    const tram = String(tramObj?.ma_tram || "").trim();
    if (
      !passesScPickerWhitelist({
        isActive: r.is_active === true,
        tramHienTai: tram,
        metadata: r.metadata,
      })
    ) {
      continue;
    }
    const maBo = String(boObj?.ma_bo || "").trim();
    const tenBo = String(boObj?.ten_bo || "").trim() || "—";
    const id = String(boObj?.id || r.id || "").trim();
    if (!maBo || !id) continue;
    if (term) {
      const hay = `${maBo} ${tenBo} ${r.ma_qr_quy_trinh || ""} ${r.ma_cycle_qr || ""} ${r.ma_qr_bo_vinh_vien || ""}`.toUpperCase();
      if (!hay.includes(term)) continue;
    }
    const key = maBo.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ id, ma_bo: maBo, ten_bo: tenBo });
    if (rows.length >= 200) break;
  }

  rows.sort((a, b) => a.ma_bo.localeCompare(b.ma_bo));
  return { success: true as const, data: rows };
}
