import type { SupabaseClient } from "@supabase/supabase-js";

const SAN_SANG_CHO_ME = new Set(["READY", "HOAT_DONG"]);

/** Trạng thái máy cho phép lập / tiếp tục mẻ tiệt khuẩn trên thiết bị này. */
export async function assertThietBiSanSangChoMeTietKhuan(
  client: SupabaseClient,
  thietBiId: string,
): Promise<{ ok: true; ten_thiet_bi: string } | { ok: false; message: string }> {
  const id = String(thietBiId || "").trim();
  if (!id) return { ok: false, message: "Thiếu thiết bị." };

  const { data: tb, error } = await client.from("dm_thiet_bi").select("id, ten_thiet_bi, trang_thai").eq("id", id).maybeSingle();
  if (error) return { ok: false, message: error.message };
  if (!tb) return { ok: false, message: "Không tìm thấy thiết bị." };

  const st = String((tb as { trang_thai?: string }).trang_thai || "").trim();
  if (!SAN_SANG_CHO_ME.has(st)) {
    const human =
      st === "REPAIRING"
        ? "đang bảo trì"
        : st === "BROKEN"
          ? "hỏng / ngưng dùng"
          : st === "RETIRED"
            ? "đã thải"
            : "không sẵn sàng";
    return {
      ok: false,
      message: `Thiết bị ${human}. Không thể thao tác mẻ tiệt khuẩn trên máy này (${st || "—"}).`,
    };
  }
  return { ok: true, ten_thiet_bi: String((tb as { ten_thiet_bi?: string }).ten_thiet_bi || "") };
}

/** Mẻ đã ghi nhận kết quả QC (đạt/không đạt) coi là đã kết thúc; chỉ chặn khi chưa có ket_qua_test. */
export async function coMeTietKhuanChuaKetThucTheoThietBi(
  client: SupabaseClient,
  thietBiId: string,
): Promise<{ open: boolean; ma_lo?: string }> {
  const id = String(thietBiId || "").trim();
  if (!id) return { open: false };

  const { data: row } = await client
    .from("fact_lo_tiet_khuan")
    .select("ma_lo_tiet_khuan")
    .eq("thiet_bi_id", id)
    .eq("is_active", true)
    .is("ket_qua_test", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (row && (row as { ma_lo_tiet_khuan?: string }).ma_lo_tiet_khuan) {
    return { open: true, ma_lo: String((row as { ma_lo_tiet_khuan?: string }).ma_lo_tiet_khuan || "") };
  }
  return { open: false };
}
