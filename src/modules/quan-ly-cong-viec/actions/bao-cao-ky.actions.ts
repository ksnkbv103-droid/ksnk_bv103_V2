"use server";

/**
 * Báo cáo kỳ QLCV MVP (Domain SSOT §6 / Q-14).
 * Không RPC mới — đọc `qlcv_fact_cong_viec` (+ tên MDM) cap 2000, aggregate TS.
 * `hoan_thanh_luc` không có trên `v_qlcv_cong_viec_full` nên đọc fact trực tiếp.
 */

import { ensureQlcvKsnkAccess } from "../lib/qlcv-action-guard";
import {
  buildQlcvBaoCaoKyPayload,
  QLCV_BAO_CAO_FETCH_CAP,
  type QlcvBaoCaoKyPayload,
  type QlcvBaoCaoPeriodKind,
  type QlcvBaoCaoRow,
} from "../lib/qlcv-bao-cao-ky";
import { resolveQlcvPeriodRange, resolveQlcvPeriodRangeShifted } from "../lib/qlcv-period-range";

export type GetQlcvBaoCaoKyInput = {
  periodKind: QlcvBaoCaoPeriodKind;
  /** Dịch kỳ: 0 = hiện tại, -1 = kỳ trước, … */
  shift?: number;
};

type FactLite = {
  id: string;
  tieu_de: string | null;
  trang_thai: string | null;
  is_active: boolean | null;
  han_hoan_thanh: string | null;
  hoan_thanh_luc: string | null;
  phan_tram_hoan_thanh: number | null;
  nguoi_phu_trach_id: string | null;
  nguoi_giao_viec_id: string | null;
  created_at: string | null;
};

async function loadStaffNameMap(
  supabase: Awaited<ReturnType<typeof ensureQlcvKsnkAccess>>["supabase"],
  ids: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return map;

  const chunk = 200;
  for (let i = 0; i < unique.length; i += chunk) {
    const slice = unique.slice(i, i + chunk);
    const { data, error } = await supabase.from("mdm_nhan_su").select("id, ho_ten").in("id", slice);
    if (error) {
      console.error("bao-cao-ky: mdm_nhan_su names", error);
      continue;
    }
    for (const row of data ?? []) {
      map.set(String(row.id), String(row.ho_ten ?? "").trim());
    }
  }
  return map;
}

export async function getQlcvBaoCaoKy(input: GetQlcvBaoCaoKyInput): Promise<QlcvBaoCaoKyPayload> {
  const kind = input.periodKind;
  if (kind !== "WEEK" && kind !== "MONTH" && kind !== "QUARTER") {
    throw new Error("Kỳ báo cáo chỉ hỗ trợ tuần / tháng / quý.");
  }
  const shift = Number.isFinite(input.shift) ? Math.trunc(input.shift as number) : 0;
  const period =
    shift === 0 ? resolveQlcvPeriodRange(kind) : resolveQlcvPeriodRangeShifted(kind, shift);

  const { supabase } = await ensureQlcvKsnkAccess("view");

  // Admin client: fact có hoan_thanh_luc; view full chưa expose cột này (không mig mới).
  const { data, error } = await supabase
    .from("qlcv_fact_cong_viec")
    .select(
      "id,tieu_de,trang_thai,is_active,han_hoan_thanh,hoan_thanh_luc,phan_tram_hoan_thanh,nguoi_phu_trach_id,nguoi_giao_viec_id,created_at",
    )
    .order("updated_at", { ascending: false })
    .limit(QLCV_BAO_CAO_FETCH_CAP);

  if (error) {
    console.error("bao-cao-ky: fact fetch", error);
    throw new Error(`Không tải được dữ liệu báo cáo: ${error.message}`);
  }

  const facts = (data ?? []) as FactLite[];
  const truncated = facts.length >= QLCV_BAO_CAO_FETCH_CAP;

  const nameMap = await loadStaffNameMap(
    supabase,
    facts.flatMap((f) => [f.nguoi_phu_trach_id, f.nguoi_giao_viec_id].filter(Boolean) as string[]),
  );

  const rows: QlcvBaoCaoRow[] = facts.map((f) => ({
    id: String(f.id),
    tieu_de: String(f.tieu_de ?? "").trim() || "(không tiêu đề)",
    trang_thai: f.trang_thai,
    is_active: f.is_active,
    han_hoan_thanh: f.han_hoan_thanh,
    hoan_thanh_luc: f.hoan_thanh_luc,
    phan_tram_hoan_thanh: f.phan_tram_hoan_thanh,
    nguoi_phu_trach_id: f.nguoi_phu_trach_id,
    nguoi_phu_trach_ten: f.nguoi_phu_trach_id
      ? nameMap.get(String(f.nguoi_phu_trach_id)) ?? null
      : null,
    nguoi_giao_viec_id: f.nguoi_giao_viec_id,
    nguoi_giao_ten: f.nguoi_giao_viec_id
      ? nameMap.get(String(f.nguoi_giao_viec_id)) ?? null
      : null,
    created_at: f.created_at,
  }));

  return buildQlcvBaoCaoKyPayload(rows, period, {
    truncated,
    fetchCap: QLCV_BAO_CAO_FETCH_CAP,
  });
}
