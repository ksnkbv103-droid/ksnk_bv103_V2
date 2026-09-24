import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isBlockingSterilizationIncident,
  type PackBatchReleaseGate,
} from "@/lib/domain/cssd-pack-issuance";

type MeRow = {
  trang_thai_me?: string | null;
  ket_qua_test?: boolean | null;
};

function resolveTrangThaiMe(me: MeRow | null): string | null {
  const stored = String(me?.trang_thai_me || "").trim().toUpperCase();
  if (stored) return stored;
  if (me?.ket_qua_test === true) return "HOAN_THANH";
  if (me?.ket_qua_test === false) return "QC_KHONG_DAT";
  return null;
}

/** Đọc trạng thái mẻ + sự cố tiệt khuẩn OPEN/đã xác nhận trước khi cấp phát. */
export async function loadPackBatchReleaseGate(
  client: SupabaseClient,
  args: { quyTrinhId: string; loTietKhuanId?: string | null },
): Promise<PackBatchReleaseGate> {
  const quyTrinhId = String(args.quyTrinhId || "").trim();
  const loId = String(args.loTietKhuanId || "").trim();
  let trangThaiMe: string | null = null;
  if (loId) {
    const { data, error } = await client
      .from("cssd_fact_lo_tiet_khuan")
      .select("trang_thai_me, ket_qua_test")
      .eq("id", loId)
      .maybeSingle();
    if (error) {
      return { trangThaiMe: null, hasOpenSterilizationIncident: true };
    }
    trangThaiMe = resolveTrangThaiMe((data || null) as MeRow | null);
  }

  const filters = [`quy_trinh_id.eq.${quyTrinhId}`];
  if (loId) filters.push(`attributes->>LO_TIET_KHUAN_ID.eq.${loId}`);
  const { data: incidents, error: incErr } = await client
    .from("cssd_fact_su_co")
    .select("quy_trinh_id, ma_tram_phat_hien, ma_tram_gay_loi, attributes, is_active")
    .eq("is_active", true)
    .or(filters.join(","))
    .limit(40);
  if (incErr) {
    return { trangThaiMe, hasOpenSterilizationIncident: true };
  }
  const blocked = (incidents || []).some((row) =>
    isBlockingSterilizationIncident(
      row as {
        quy_trinh_id?: string | null;
        ma_tram_phat_hien?: string | null;
        ma_tram_gay_loi?: string | null;
        attributes?: Record<string, unknown> | null;
        is_active?: boolean | null;
      },
      { quyTrinhId, loTietKhuanId: loId || null },
    ),
  );
  return { trangThaiMe, hasOpenSterilizationIncident: blocked };
}
