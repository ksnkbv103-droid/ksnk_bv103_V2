import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchActiveRegistryDmRows } from "@/lib/master-data/registry-select-fetch";

/** Tải danh sách mẻ + máy; đếm số `quy_trinh` đang gắn từng mẻ (truy vết). */
export async function fetchBatchesAndMachines(supabase: SupabaseClient): Promise<{
  batches: unknown[];
  machines: unknown[];
  batchError?: string;
  machineError?: string;
}> {
  const [bRes, mRes, loaiPack] = await Promise.all([
    supabase.from("fact_lo_tiet_khuan").select("*, thiet_bi:dm_thiet_bi(ten_thiet_bi)").eq("is_active", true).order("created_at", { ascending: false }),
    // Form MDM dùng READY/REPAIRING/…; chỉ READY (và mã cũ HOAT_DONG nếu có) được chọn làm máy mẻ TK.
    supabase.from("dm_thiet_bi").select("*").eq("is_active", true).in("trang_thai", ["READY", "HOAT_DONG"]),
    (async () => {
      try {
        return { rows: await fetchActiveRegistryDmRows(supabase, "LOAI_MAY_TIET_KHUAN") };
      } catch {
        return { rows: [] as { ma: string; ten: string }[] };
      }
    })(),
  ]);
  const raw = (bRes.data || []) as { id: string }[];
  const ids = raw.map((b) => b.id).filter(Boolean);
  const byMe = new Map<string, number>();
  if (ids.length > 0) {
    const { data: qrows } = await supabase
      .from("fact_quy_trinh")
      .select("lo_tiet_khuan_id")
      .in("lo_tiet_khuan_id", ids)
      .eq("is_active", true);
    for (const r of qrows || []) {
      const lid = (r as { lo_tiet_khuan_id?: string }).lo_tiet_khuan_id;
      if (!lid) continue;
      byMe.set(lid, (byMe.get(lid) || 0) + 1);
    }
  }
  const batches = raw.map((b) => ({ ...b, so_bo_trong_me: byMe.get(b.id) || 0 }));
  const loaiMap = new Map(loaiPack.rows.map((r) => [r.ma, r.ten]));
  const machines = (mRes.data || []).map((m: Record<string, unknown>) => {
    const ma = String(m.loai_thiet_bi || "").trim();
    const loaiTen = ma ? loaiMap.get(ma) || ma : "";
    return { ...m, loai_ten_hien_thi: loaiTen };
  });
  return {
    batches,
    machines,
    batchError: bRes.error?.message,
    machineError: mRes.error?.message,
  };
}
