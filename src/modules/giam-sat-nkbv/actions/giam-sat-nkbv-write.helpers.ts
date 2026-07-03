import type { createAdminSupabaseClient } from "@/lib/supabase-server";

export type Payload = Record<string, unknown>;

export function clean(payload: Payload): Payload {
  const o = { ...payload };
  Object.keys(o).forEach((k) => {
    if (o[k] === "") o[k] = null;
  });
  return o;
}

export async function validateLoaiTrangAndLyDo(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  loai_nkbv_id: string,
  trang_thai_id: string,
  ly_do_loai_tru: unknown,
) {
  const { data: tt, error: et } = await supabase
    .from("nkbv_dm_trang_thai_ca")
    .select("id, ma_trang_thai")
    .eq("id", trang_thai_id)
    .eq("is_active", true)
    .maybeSingle();
  if (et) throw new Error(et.message);
  if (!tt?.id) throw new Error("Trạng thái phiếu không hợp lệ.");

  const { data: lo, error: el } = await supabase
    .from("nkbv_dm_loai")
    .select("id")
    .eq("id", loai_nkbv_id)
    .eq("is_active", true)
    .maybeSingle();
  if (el) throw new Error(el.message);
  if (!lo) throw new Error("Loại NKBV không hợp lệ.");

  const ttMa = String((tt as { ma_trang_thai?: string }).ma_trang_thai || "");
  if (ttMa === "LOAI_TRU" && !String(ly_do_loai_tru ?? "").trim()) {
    throw new Error("Trạng thái Loại trừ: vui lòng nhập lý do loại trừ.");
  }
}
