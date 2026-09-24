import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchActiveRegistryDmRows } from "@/lib/master-data/registry-select-fetch";
import { getSterilizerMethod } from "./me-tiet-khuan-machine-kind";

const ME_TRANG_THAI = new Set([
  "DANG_CHUAN_NAP",
  "DANG_TIET_KHUAN",
  "CHO_DANH_GIA_QC",
  "CHO_BI",
  "HOAN_THANH",
  "QC_KHONG_DAT",
  "THU_HOI",
]);

/** Tải danh sách mẻ + máy; đếm số `quy_trinh` đang gắn từng mẻ (truy vết). */
export async function fetchBatchesAndMachines(supabase: SupabaseClient): Promise<{
  batches: unknown[];
  machines: unknown[];
  batchError?: string;
  machineError?: string;
}> {
  const [bRes, mRes, loaiPack] = await Promise.all([
    supabase.from("cssd_fact_lo_tiet_khuan").select("*, thiet_bi:cssd_dm_thiet_bi(ten_thiet_bi)").eq("is_active", true).order("created_at", { ascending: false }),
    // Form MDM dùng READY/REPAIRING/…; chỉ READY (và mã cũ HOAT_DONG nếu có) được chọn làm máy mẻ TK.
    supabase
      .from("cssd_dm_thiet_bi")
      .select("*, loai_may:cssd_dm_loai_may(ma_loai_may, ten_loai_may)")
      .eq("is_active", true)
      .in("trang_thai", ["READY", "HOAT_DONG"]),
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
      .from("cssd_fact_quy_trinh")
      .select("lo_tiet_khuan_id")
      .in("lo_tiet_khuan_id", ids);
    for (const r of qrows || []) {
      const lid = (r as { lo_tiet_khuan_id?: string }).lo_tiet_khuan_id;
      if (!lid) continue;
      byMe.set(lid, (byMe.get(lid) || 0) + 1);
    }
  }
  const batches = raw.map((b) => {
    const row = b as Record<string, unknown>;
    const stored = String(row.trang_thai_me || "").trim();
    const ket = row.ket_qua_test as boolean | null | undefined;
    const tkMo = row.tk_mo_form_qc_at as string | null | undefined;
    const tkChot = row.tk_chot_nap_at as string | null | undefined;
    let trang_thai = "DANG_CHUAN_NAP";
    if (ME_TRANG_THAI.has(stored)) trang_thai = stored;
    else if (ket === true) trang_thai = "HOAN_THANH";
    else if (ket === false) trang_thai = "QC_KHONG_DAT";
    else if (tkMo) trang_thai = "CHO_DANH_GIA_QC";
    else if (tkChot) trang_thai = "DANG_TIET_KHUAN";
    return { ...b, so_bo_trong_me: byMe.get(b.id) || 0, trang_thai };
  });
  const loaiMap = new Map(loaiPack.rows.map((r) => [r.ma, r.ten]));
  const machines = (mRes.data || [])
    .map((m: Record<string, unknown>) => {
      const lm = m.loai_may as { ma_loai_may?: string; ten_loai_may?: string } | { ma_loai_may?: string; ten_loai_may?: string }[] | null;
      const lmRow = Array.isArray(lm) ? lm[0] : lm;
      const ma = String(lmRow?.ma_loai_may || "").trim();
      const loaiTen = String(lmRow?.ten_loai_may || "").trim() || (ma ? loaiMap.get(ma) || ma : "");
      const phuong_phap = getSterilizerMethod({ ma_loai_may: ma, loai_may: lmRow });
      return { ...m, loai_ten_hien_thi: loaiTen, loai_thiet_bi: ma, phuong_phap };
    })
    .filter((m) => m.phuong_phap != null);
  return {
    batches,
    machines,
    batchError: bRes.error?.message,
    machineError: mRes.error?.message,
  };
}
