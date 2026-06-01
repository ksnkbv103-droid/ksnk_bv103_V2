"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { getErrorMessage, mapFkError } from "./cssd-action-common";
import { buildSupabaseSearchFilter } from "@/lib/supabase-search-helper";
import type { KhoHoaChatTonLo, KhoHoaChatGiaoDichRow } from "./cssd-kho-hoa-chat.types";

type TonAggregateRow = {
  dm_hoa_chat_id: string;
  ma_lo: string | null;
  han_su_dung: string | null;
  ton_so_luong: number;
};

async function aggregateTonTheoLo(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
): Promise<{ success: true; data: TonAggregateRow[] } | { success: false; error: string }> {
  const { data: rawRows, error } = await supabase
    .from("v_cssd_kho_hoa_chat_ton_lo")
    .select("dm_hoa_chat_id, ma_lo, han_su_dung, ton_so_luong");
  if (error) return { success: false, error: mapFkError(error.message) };
  const data = (rawRows || []).map((row: Record<string, unknown>) => ({
    dm_hoa_chat_id: String(row.dm_hoa_chat_id || "").trim(),
    ma_lo: row.ma_lo != null ? String(row.ma_lo).trim() || null : null,
    han_su_dung: row.han_su_dung != null ? String(row.han_su_dung).slice(0, 10) : null,
    ton_so_luong: Number(row.ton_so_luong || 0),
  }));
  return { success: true, data };
}

/** Tồn theo lô + join danh mục (chỉ dòng ton > 0). */
export async function listTonTheoLoKhoHoaChatAction(): Promise<
  { success: true; data: KhoHoaChatTonLo[] } | { success: false; error: string }
> {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyPermission("KSNK_KHO_HOACHAT", "view");
    const tonRes = await aggregateTonTheoLo(supabase);
    if (!tonRes.success) return tonRes;
    const vRows = tonRes.data;
    const dmIds = [...new Set((vRows || []).map((r: { dm_hoa_chat_id?: string }) => String(r.dm_hoa_chat_id || "")).filter(Boolean))];
    let dmMap = new Map<string, { ma_hoa_chat?: string; ten_hoa_chat?: string; don_vi_tinh?: string | null; nguong_ton_toi_thieu?: number | null }>();
    if (dmIds.length) {
      const { data: dms, error: dErr } = await supabase
        .from("dm_hoa_chat")
        .select("id, ma_hoa_chat, ten_hoa_chat, don_vi_tinh, nguong_ton_toi_thieu")
        .in("id", dmIds);
      if (dErr) return { success: false, error: mapFkError(dErr.message) };
      dmMap = new Map((dms || []).map((x: Record<string, unknown>) => [String(x.id), x as never]));
    }
    const data: KhoHoaChatTonLo[] = (vRows || [])
      .map((r: Record<string, unknown>) => {
        const ton = Number(r.ton_so_luong);
        const id = String(r.dm_hoa_chat_id || "");
        const dm = dmMap.get(id);
        const maLo = r.ma_lo != null ? String(r.ma_lo) : null;
        const han = r.han_su_dung != null ? String(r.han_su_dung).slice(0, 10) : null;
        return {
          id: `${id}|${maLo ?? ""}|${han ?? ""}`,
          dm_hoa_chat_id: id,
          ma_lo: maLo,
          han_su_dung: han,
          ton_so_luong: ton,
          ma_hoa_chat: dm ? String((dm as { ma_hoa_chat?: string }).ma_hoa_chat || "") : undefined,
          ten_hoa_chat: dm ? String((dm as { ten_hoa_chat?: string }).ten_hoa_chat || "") : undefined,
          don_vi_tinh: dm ? ((dm as { don_vi_tinh?: string | null }).don_vi_tinh ?? null) : null,
          nguong_ton_toi_thieu:
            dm && (dm as { nguong_ton_toi_thieu?: unknown }).nguong_ton_toi_thieu != null
              ? Number((dm as { nguong_ton_toi_thieu?: number }).nguong_ton_toi_thieu)
              : null,
        };
      })
      .filter((x) => x.ton_so_luong > 0);
    data.sort((a, b) => String(a.ten_hoa_chat || "").localeCompare(String(b.ten_hoa_chat || ""), "vi"));
    return { success: true, data };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) };
  }
}

/** Nhật ký giao dịch gần nhất. */
export async function listGiaoDichKhoHoaChatAction(params?: { limit?: number }): Promise<
  { success: true; data: KhoHoaChatGiaoDichRow[] } | { success: false; error: string }
> {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyPermission("KSNK_KHO_HOACHAT", "view");
    const lim = Math.min(500, Math.max(10, Number(params?.limit) || 150));
    const { data: rows, error } = await supabase
      .from("cssd_fact_kho_hoa_chat_giao_dich")
      .select("id, ma_phieu, dm_hoa_chat_id, loai_giao_dich, so_luong_co_dau, ma_lo, han_su_dung, ghi_chu, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(lim);
    if (error) return { success: false, error: mapFkError(error.message) };
    const rawRows = rows || [];
    const dmIds = [...new Set(rawRows.map((r: { dm_hoa_chat_id?: string }) => String(r.dm_hoa_chat_id || "")).filter(Boolean))];
    const tenMap = new Map<string, string>();
    if (dmIds.length) {
      const { data: dms } = await supabase.from("dm_hoa_chat").select("id, ten_hoa_chat").in("id", dmIds);
      for (const d of dms || []) {
        tenMap.set(String((d as { id?: string }).id), String((d as { ten_hoa_chat?: string }).ten_hoa_chat || ""));
      }
    }
    const data = rawRows.map((r: Record<string, unknown>) => ({
      id: String(r.id),
      ma_phieu: String(r.ma_phieu || ""),
      dm_hoa_chat_id: String(r.dm_hoa_chat_id || ""),
      loai_giao_dich: String(r.loai_giao_dich || ""),
      so_luong_co_dau: Number(r.so_luong_co_dau),
      ma_lo: r.ma_lo != null ? String(r.ma_lo) : null,
      han_su_dung: r.han_su_dung != null ? String(r.han_su_dung).slice(0, 10) : null,
      ghi_chu: r.ghi_chu != null ? String(r.ghi_chu) : null,
      created_at: r.created_at != null ? String(r.created_at) : null,
      ten_hoa_chat: tenMap.get(String(r.dm_hoa_chat_id)) || null,
    }));
    return { success: true, data };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) };
  }
}

/** Danh mục hóa chất active — chọn khi nhập. */
export async function listDmHoaChatChoKhoAction(search?: string): Promise<
  {
    success: true;
    data: { id: string; ma_hoa_chat: string; ten_hoa_chat: string; don_vi_tinh: string | null; nguong_ton_toi_thieu: number | null }[];
  } | {
    success: false;
    error: string;
  }
> {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyPermission("KSNK_KHO_HOACHAT", "view");
    let q = supabase
      .from("dm_hoa_chat")
      .select("id, ma_hoa_chat, ten_hoa_chat, don_vi_tinh, nguong_ton_toi_thieu")
      .eq("is_active", true)
      .order("ma_hoa_chat", { ascending: true });

    const searchFilter = buildSupabaseSearchFilter(search, ["ma_hoa_chat", "ten_hoa_chat"]);
    if (searchFilter) q = q.or(searchFilter);

    const { data, error } = await q;
    if (error) return { success: false, error: mapFkError(error.message) };
    return {
      success: true,
      data: (data || []).map((x: Record<string, unknown>) => ({
        id: String(x.id),
        ma_hoa_chat: String(x.ma_hoa_chat || ""),
        ten_hoa_chat: String(x.ten_hoa_chat || ""),
        don_vi_tinh: x.don_vi_tinh != null ? String(x.don_vi_tinh) : null,
        nguong_ton_toi_thieu: x.nguong_ton_toi_thieu != null && x.nguong_ton_toi_thieu !== "" ? Number(x.nguong_ton_toi_thieu) : null,
      })),
    };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) };
  }
}

export async function capNhatNguongTonKhoAction(input: { dm_hoa_chat_id: string; nguong_ton_toi_thieu: string | number | null }) {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyPermission("KSNK_KHO_HOACHAT", "edit");
    const id = String(input.dm_hoa_chat_id || "").trim();
    if (!id) return { success: false as const, error: "Thiếu mặt hàng." };
    const raw = input.nguong_ton_toi_thieu;
    let nguong: number | null = null;
    if (raw !== "" && raw != null) {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) return { success: false as const, error: "Ngưỡng không hợp lệ." };
      nguong = n;
    }
    const { error } = await supabase
      .from("dm_hoa_chat")
      .update({ nguong_ton_toi_thieu: nguong, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { success: false as const, error: mapFkError(error.message) };
    return { success: true as const };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}
