"use server";

import { fetchAllRangeRows } from "@/lib/fetch-all-range";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { todayYmdInVn } from "@/lib/format-datetime-vi";
import type { NxtSoRow } from "@/lib/domain/cssd-kho-hoa-chat-bao-cao-nxt";
import { CANH_BAO_CUA_SO_NGAY } from "@/lib/domain/cssd-kho-hoa-chat-canh-bao-ton";
import { getErrorMessage, mapFkError } from "./cssd-action-common";
import type { KhoHoaChatLuuLuong } from "./cssd-kho-hoa-chat.types";

/** Lượng nhập và lượng xuất «Cấp sử dụng» đã duyệt trong 30 ngày gần nhất, theo mặt hàng (đọc sổ, không bảng tổng hợp). */
export async function listLuuLuongKhoHoaChatAction(): Promise<
  { success: true; data: KhoHoaChatLuuLuong[] } | { success: false; error: string }
> {
  try {
    await verifyPermission("KSNK_KHO_HOACHAT", "view");
    const supabase = createAdminSupabaseClient();
    const tu = new Date(Date.now() - CANH_BAO_CUA_SO_NGAY * 86_400_000).toISOString();
    const rows = await fetchAllRangeRows<Record<string, unknown>>((from, to) =>
      supabase
        .from("cssd_fact_kho_hoa_chat_giao_dich")
        .select("dm_hoa_chat_id, loai_giao_dich, so_luong_co_dau, ly_do_xuat")
        .eq("is_active", true)
        .eq("trang_thai", "DA_DUYET")
        .in("loai_giao_dich", ["NHAP", "XUAT"])
        .gte("created_at", tu)
        .order("created_at", { ascending: true })
        .range(from, to),
    );
    const map = new Map<string, KhoHoaChatLuuLuong>();
    for (const r of rows) {
      const id = String(r.dm_hoa_chat_id || "");
      if (!id) continue;
      const cur = map.get(id) ?? { dm_hoa_chat_id: id, nhap_30n: 0, xuat_su_dung_30n: 0 };
      const q = Number(r.so_luong_co_dau) || 0;
      if (r.loai_giao_dich === "NHAP") cur.nhap_30n += Math.abs(q);
      // Phiếu xuất cũ (trước HC-E) chưa có lý do → coi là cấp sử dụng.
      else if (r.ly_do_xuat == null || r.ly_do_xuat === "CAP_SU_DUNG") cur.xuat_su_dung_30n += Math.abs(q);
      map.set(id, cur);
    }
    return { success: true, data: [...map.values()] };
  } catch (e: unknown) {
    const msg = getErrorMessage(e);
    return { success: false, error: mapFkError(msg) };
  }
}

/** Sổ phiếu đã duyệt đến hết ngày `den` (giờ VN) — đầu vào báo cáo Nhập–Xuất–Tồn; gộp theo kỳ ở domain. */
export async function listSoKhoHoaChatDenNgayAction(den: string): Promise<
  { success: true; data: NxtSoRow[] } | { success: false; error: string }
> {
  try {
    await verifyPermission("KSNK_KHO_HOACHAT", "view");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(den)) return { success: false, error: "Ngày kết thúc không hợp lệ." };
    const hetNgay = new Date(new Date(`${den}T00:00:00+07:00`).getTime() + 86_400_000).toISOString();
    const supabase = createAdminSupabaseClient();
    const rows = await fetchAllRangeRows<Record<string, unknown>>((from, to) =>
      supabase
        .from("cssd_fact_kho_hoa_chat_giao_dich")
        .select("dm_hoa_chat_id, so_luong_co_dau, ly_do_xuat, created_at")
        .eq("is_active", true)
        .eq("trang_thai", "DA_DUYET")
        .lt("created_at", hetNgay)
        .order("created_at", { ascending: true })
        .range(from, to),
    );
    return {
      success: true,
      data: rows.map((r) => ({
        dm_hoa_chat_id: String(r.dm_hoa_chat_id || ""),
        so_luong_co_dau: Number(r.so_luong_co_dau),
        ly_do_xuat: r.ly_do_xuat != null ? String(r.ly_do_xuat) : null,
        ngay: todayYmdInVn(new Date(String(r.created_at))),
      })),
    };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) };
  }
}
