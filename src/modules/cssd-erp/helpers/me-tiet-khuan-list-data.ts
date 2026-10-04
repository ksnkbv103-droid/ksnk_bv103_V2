import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllByIdChunks, fetchAllRangeRows } from "@/lib/fetch-all-range";
import { fetchActiveRegistryDmRows } from "@/lib/master-data/registry-select-fetch";
import { countActiveLinkedMembers } from "../lib/me-tiet-khuan-batch-integrity";
import { getSterilizerMethod } from "./me-tiet-khuan-machine-kind";

const ME_TRANG_THAI = new Set([
  "DANG_CHUAN_NAP",
  "DANG_TIET_KHUAN",
  "CHO_DANH_GIA_QC",
  "CHO_BI",
  "Quarantine_BI",
  "HOAN_THANH",
  "QC_KHONG_DAT",
  "THU_HOI",
]);

/** Cột hẹp cho LIST + openRowForProcess / status derivation — không select(*). */
const LO_LIST_SELECT =
  "id, ma_lo_tiet_khuan, ghi_chu, created_at, is_active, trang_thai_me, ket_qua_test, tk_mo_form_qc_at, tk_chot_nap_at, chuong_trinh, thiet_bi_id, thiet_bi:cssd_dm_thiet_bi(ten_thiet_bi)";

/** Tải danh sách mẻ + máy; đếm số `quy_trinh` đang gắn từng mẻ (truy vết). */
export async function fetchBatchesAndMachines(supabase: SupabaseClient): Promise<{
  batches: unknown[];
  machines: unknown[];
  batchError?: string;
  machineError?: string;
}> {
  const [batchPack, mRes, loaiPack, chuongTrinh] = await Promise.all([
    fetchAllRangeRows<Record<string, unknown>>((from, to) =>
      supabase
        .from("cssd_fact_lo_tiet_khuan")
        .select(LO_LIST_SELECT)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    )
      .then((rows) => ({ rows, error: null as string | null }))
      .catch((e: unknown) => ({
        rows: [] as Record<string, unknown>[],
        error: e instanceof Error ? e.message : "Không tải danh sách mẻ",
      })),
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
    // M-04: catalog theo máy — đọc hết trang.
    fetchAllRangeRows<Record<string, unknown>>((from, to) =>
      supabase
        .from("cssd_dm_chuong_trinh_may")
        .select(
          "thiet_bi_id, ma_chuong_trinh, ten_chuong_trinh, nhiet_do_chuan, ap_suat_chuan, thoi_gian_chuan, is_active, sort_order",
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("thiet_bi_id", { ascending: true })
        .range(from, to),
    ).catch(() => [] as Record<string, unknown>[]),
  ]);
  const raw = batchPack.rows as { id: string }[];
  const ids = raw.map((b) => b.id).filter(Boolean);
  let byMe = new Map<string, number>();
  if (ids.length > 0) {
    // Nhiều mẻ: chia .in() + đọc hết trang — tránh cắt im PostgREST.
    const qrows = await fetchAllByIdChunks<{ lo_tiet_khuan_id?: string | null; is_active?: boolean | null }>(
      ids,
      (idChunk, from, to) =>
        supabase
          .from("cssd_fact_quy_trinh")
          .select("lo_tiet_khuan_id, is_active")
          .in("lo_tiet_khuan_id", idChunk)
          .eq("is_active", true)
          .order("lo_tiet_khuan_id", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to),
    );
    byMe = countActiveLinkedMembers(qrows);
  }
  const batchRows = raw.map((b) => {
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
  const chuongByMay = new Map<string, Record<string, unknown>[]>();
  for (const row of chuongTrinh) {
    const tid = String(row.thiet_bi_id || "").trim();
    if (!tid) continue;
    const list = chuongByMay.get(tid) || [];
    list.push(row);
    chuongByMay.set(tid, list);
  }
  const loaiMap = new Map(loaiPack.rows.map((r) => [r.ma, r.ten]));
  /** M-04 default = chương trình gần nhất của máy (từ list mẻ vừa tải). */
  const lastChuongByMay = new Map<string, string>();
  for (const b of raw) {
    const row = b as { thiet_bi_id?: string; chuong_trinh?: string | null };
    const tid = String(row.thiet_bi_id || "").trim();
    const ct = String(row.chuong_trinh || "").trim();
    if (tid && ct && !lastChuongByMay.has(tid)) lastChuongByMay.set(tid, ct);
  }
  const machines = (mRes.data || [])
    .map((m: Record<string, unknown>) => {
      const lm = m.loai_may as { ma_loai_may?: string; ten_loai_may?: string } | { ma_loai_may?: string; ten_loai_may?: string }[] | null;
      const lmRow = Array.isArray(lm) ? lm[0] : lm;
      const ma = String(lmRow?.ma_loai_may || "").trim();
      const loaiTen = String(lmRow?.ten_loai_may || "").trim() || (ma ? loaiMap.get(ma) || ma : "");
      const phuong_phap = getSterilizerMethod({ ma_loai_may: ma, loai_may: lmRow });
      const mid = String(m.id || "").trim();
      return {
        ...m,
        loai_ten_hien_thi: loaiTen,
        loai_thiet_bi: ma,
        phuong_phap,
        chuong_trinh_gan_nhat: lastChuongByMay.get(mid) || null,
        mdm_chuong_trinh: chuongByMay.get(mid) || [],
      };
    })
    .filter((m) => m.phuong_phap != null);
  return {
    batches: batchRows,
    machines,
    batchError: batchPack.error || undefined,
    machineError: mRes.error?.message,
  };
}
