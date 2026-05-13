import type { SupabaseClient } from "@supabase/supabase-js";
import type { NhanSu } from "../types";

type DmIdMa = { id?: string };

function pickMa(map: Map<string, string>, idRaw: string | null | undefined) {
  const id = String(idRaw || "").trim();
  if (!id) return null;
  return map.get(id) || null;
}

/** Bản export: thêm mã danh mục FK để xuất Excel. */
export async function buildNhanSuExportRows(
  supabase: SupabaseClient,
  rows: NhanSu[],
): Promise<Record<string, unknown>[]> {
  const khoaIds = Array.from(new Set(rows.map((x) => String(x.khoa_id || "").trim()).filter(Boolean)));
  const toIds = Array.from(new Set(rows.map((x) => String(x.to_id || "").trim()).filter(Boolean)));
  const chucVuIds = Array.from(new Set(rows.map((x) => String(x.chuc_vu_id || "").trim()).filter(Boolean)));
  const chucDanhIds = Array.from(new Set(rows.map((x) => String(x.chuc_danh_id || "").trim()).filter(Boolean)));
  const vaiTroIds = Array.from(new Set(rows.map((x) => String(x.vai_tro_he_thong_id || "").trim()).filter(Boolean)));
  const dmExportIds = Array.from(new Set([...chucVuIds, ...chucDanhIds, ...vaiTroIds]));
  const [khoaRes, toRes, chucVuRes, chucDanhRes, vaiTroRes] = await Promise.all([
    khoaIds.length
      ? supabase.from("dm_khoa_phong").select("id, ma_khoa").in("id", khoaIds)
      : Promise.resolve({ data: [], error: null }),
    toIds.length
      ? supabase.from("dm_to_cong_tac").select("id, ma_to, ten_to").in("id", toIds)
      : Promise.resolve({ data: [], error: null }),
    dmExportIds.length
      ? supabase.from("dm_chuc_vu").select("id, ma_chuc_vu").in("id", dmExportIds)
      : Promise.resolve({ data: [], error: null }),
    dmExportIds.length
      ? supabase.from("dm_chuc_danh").select("id, ma_chuc_danh").in("id", dmExportIds)
      : Promise.resolve({ data: [], error: null }),
    dmExportIds.length
      ? supabase.from("dm_roles").select("id, name").in("id", dmExportIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (khoaRes.error) throw khoaRes.error;
  if (toRes.error) throw toRes.error;
  if (chucVuRes.error) throw chucVuRes.error;
  if (chucDanhRes.error) throw chucDanhRes.error;
  if (vaiTroRes.error) throw vaiTroRes.error;

  const khoaMap = new Map(
    (khoaRes.data || []).map((x: DmIdMa & { ma_khoa?: string }) => [String(x.id), String(x.ma_khoa || "")] as const),
  );
  const toMap = new Map(
    (toRes.data || []).map((x: DmIdMa & { ma_to?: string }) => [String(x.id), String(x.ma_to || "")] as const),
  );
  const toTenMap = new Map(
    (toRes.data || []).map((x: DmIdMa & { ten_to?: string }) => [String(x.id), String(x.ten_to || "").trim()] as const),
  );
  const chucVuMap = new Map(
    (chucVuRes.data || []).map((x: DmIdMa & { ma_chuc_vu?: string }) => [
      String(x.id),
      String(x.ma_chuc_vu || ""),
    ] as const),
  );
  const chucDanhMap = new Map(
    (chucDanhRes.data || []).map((x: DmIdMa & { ma_chuc_danh?: string }) => [
      String(x.id),
      String(x.ma_chuc_danh || ""),
    ] as const),
  );
  const vaiTroMap = new Map(
    (vaiTroRes.data || []).map((x: DmIdMa & { name?: string }) => [
      String(x.id),
      String(x.name || ""),
    ] as const),
  );

  return rows.map((x) => ({
    ...x,
    ma_khoa: x.khoa_id ? khoaMap.get(String(x.khoa_id)) || null : null,
    ma_to: x.to_id ? toMap.get(String(x.to_id)) || null : null,
    ten_to_cong_tac: x.to_id ? toTenMap.get(String(x.to_id)) || null : null,
    ma_chuc_vu: pickMa(chucVuMap, x.chuc_vu_id),
    ma_chuc_danh: pickMa(chucDanhMap, x.chuc_danh_id),
    ma_vai_tro_ksnk: pickMa(vaiTroMap, x.vai_tro_he_thong_id),
  })) as Record<string, unknown>[];
}
