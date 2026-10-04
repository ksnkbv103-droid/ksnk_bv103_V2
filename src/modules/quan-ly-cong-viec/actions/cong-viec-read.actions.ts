"use server";

import { getCachedDmKhoaPhong } from "@/lib/cache/master-data-cache";
import { fetchAllRangeRows } from "@/lib/fetch-all-range";
import type { QlcvFormCatalog, QlcvSelectOption } from "../lib/qlcv-form-options";
import { getQlcvTrangThaiMauSacMap } from "../lib/qlcv-labels";
import { ensureQlcvKsnkAccess } from "../lib/qlcv-action-guard";
import { formatKhoaPickerLabel } from "@/lib/domain/khoa-display";

async function getKsnkNhanSuOptions(ksnkKhoaId: string): Promise<QlcvSelectOption[]> {
  const { supabase } = await ensureQlcvKsnkAccess("view");
  // PA1: đọc hết NV active cùng khoa KSNK — hết cắt im 500 trên dropdown giao việc.
  const data = await fetchAllRangeRows<{
    id: string;
    ho_ten: string | null;
    chuc_vu: string | null;
    to_id: string | null;
  }>((from, to) =>
    supabase
      .from("v_mdm_nhan_su_full")
      .select("id, ho_ten, chuc_vu, to_id")
      .eq("is_active", true)
      .eq("khoa_id", ksnkKhoaId)
      .order("ho_ten", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to),
  );
  return data.map((item) => ({
    id: String(item.id),
    label: `${item.ho_ten ?? ""} (${String(item.chuc_vu || "Nhân viên")})`.trim(),
    to_id: item.to_id != null ? String(item.to_id) : null,
  }));
}

async function getToCongTacOptions(): Promise<QlcvSelectOption[]> {
  const { supabase } = await ensureQlcvKsnkAccess("view");
  const data = await fetchAllRangeRows<{ id: string; ten_to: string | null; ma_to: string | null }>(
    (from, to) =>
      supabase
        .from("mdm_dm_to_cong_tac")
        .select("id, ten_to, ma_to")
        .eq("is_active", true)
        .order("ten_to", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
  );
  return data.map((item) => ({
    id: String(item.id),
    label: String(item.ten_to ?? item.ma_to ?? "").trim() || String(item.id),
  }));
}

async function getKhoaPhongOptions(): Promise<QlcvSelectOption[]> {
  const rows = await getCachedDmKhoaPhong();
  return rows.map((item) => ({
    id: String(item.id),
    label: formatKhoaPickerLabel({ ma_khoa: item.ma_khoa, ten_khoa: item.ten_khoa }),
  }));
}

/** Một round-trip: tổ + nhân sự KSNK + khoa địa điểm; màu trạng thái hardcode (Wave 3). */
export async function getQlcvFormCatalog(): Promise<QlcvFormCatalog> {
  const { ksnkKhoaId } = await ensureQlcvKsnkAccess("view");
  const [nhanSu, toCongTac, khoaPhong] = await Promise.all([
    getKsnkNhanSuOptions(ksnkKhoaId),
    getToCongTacOptions(),
    getKhoaPhongOptions(),
  ]);
  return { nhanSu, toCongTac, khoaPhong, trangThaiMauSac: getQlcvTrangThaiMauSacMap() };
}

/**
 * Map mã trạng thái → mau_sac (hardcode SSOT — không đọc qlcv_dm_trang_thai_cong_viec).
 * Giữ async export cho caller cũ; Wave 3 FE nên import sync từ qlcv-labels.
 */
export async function getTrangThaiMauSacMap(): Promise<Record<string, string>> {
  return getQlcvTrangThaiMauSacMap();
}

/** SSOT gate counts from `rpc_qlcv_board_counts` (global — no loai/period args on RPC). */
export type QlcvBoardGateCounts = {
  myTasks: number;
  inProgress: number;
  overdue: number;
  choToi: number;
};

export async function getQlcvBoardCounts(
  actorStaffId?: string | null,
): Promise<QlcvBoardGateCounts> {
  const { supabase } = await ensureQlcvKsnkAccess("view");
  const { data, error } = await supabase.rpc("rpc_qlcv_board_counts", {
    p_actor_staff_id: actorStaffId ?? null,
  });
  if (error) throw error;

  const gates =
    data && typeof data === "object" && "gates" in (data as object)
      ? ((data as { gates?: Record<string, unknown> }).gates ?? {})
      : {};

  const n = (v: unknown) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  };

  return {
    myTasks: n(gates.my_tasks),
    inProgress: n(gates.in_progress),
    overdue: n(gates.overdue),
    choToi: n(gates.cho_toi),
  };
}
