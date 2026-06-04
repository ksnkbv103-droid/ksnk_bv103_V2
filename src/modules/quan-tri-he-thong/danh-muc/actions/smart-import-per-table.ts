import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeAndValidateDmKhoaPhong, validateDanhMucIdByType } from "@/lib/master-data/validation";
import type { SmartImportDmSessionCache } from "../lib/smart-import/dm-import-session-cache";
import { addResolvedLoaiValues } from "@/lib/master-data/repository";
import {
  LOAI_CHUC_DANH,
  LOAI_CHUC_VU,
  LOAI_VAI_TRO_HE_THONG_KSNK,
} from "@/modules/quan-tri-he-thong/nhan-su/lib/nhan-su-dm-ma-loai";
import {
  normalizeDmBoDungCuChiTiet,
  normalizeDmHoaChat,
  normalizeDmThietBi,
} from "../lib/smart-import/dm-row-normalizers";
import {
  resolveBoDungCuIdForImport,
  resolveKhoiForKhoaPhongImport,
  resolveKhoaUsageForBoImport,
  resolveLoaiDungCuForBoImport,
  resolveLoaiDungCuForChiTietImport,
  resolveNhanSuParentIdsForImport,
} from "./smart-import-parent-resolvers";

export type ScopeResolveResult =
  | { ok: true; row: Record<string, unknown> }
  | { ok: false; error: string };

/** Chuẩn hóa theo từng bảng trước khi sanitize/upsert trong smart import. */
export async function resolveSmartImportScopeForTable(
  supabase: SupabaseClient,
  tableName: string,
  scopeSafeRest: Record<string, unknown>,
  rowNumber: number,
  nhanSuDmSessionCache?: SmartImportDmSessionCache,
): Promise<ScopeResolveResult> {
  let row = scopeSafeRest;
  if (tableName === "cssd_dm_bo_dung_cu_chi_tiet") {
    row = normalizeDmBoDungCuChiTiet(row);
    const resolved = await resolveBoDungCuIdForImport(supabase, row);
    if (!resolved.ok) return { ok: false, error: `Dòng ${rowNumber || "?"}: ${resolved.error}` };
    row = resolved.row;
    const resolvedLoai = await resolveLoaiDungCuForChiTietImport(supabase, row);
    if (!resolvedLoai.ok) return { ok: false, error: `Dòng ${rowNumber || "?"}: ${resolvedLoai.error}` };
    row = resolvedLoai.row;
  }
  if (tableName === "cssd_dm_bo_dung_cu") {
    const resolvedLoai = await resolveLoaiDungCuForBoImport(supabase, row);
    if (!resolvedLoai.ok) return { ok: false, error: `Dòng ${rowNumber || "?"}: ${resolvedLoai.error}` };
    row = resolvedLoai.row;
    const resolvedKhoa = await resolveKhoaUsageForBoImport(supabase, row);
    if (!resolvedKhoa.ok) return { ok: false, error: `Dòng ${rowNumber || "?"}: ${resolvedKhoa.error}` };
    row = resolvedKhoa.row;
  }
  if (tableName === "mdm_dm_khoa_phong") {
    const resolvedKhoi = await resolveKhoiForKhoaPhongImport(supabase, row);
    if (!resolvedKhoi.ok) return { ok: false, error: `Dòng ${rowNumber || "?"}: ${resolvedKhoi.error}` };
    row = resolvedKhoi.row;
  }
  if (tableName === "cssd_dm_thiet_bi") {
    row = normalizeDmThietBi(row);
  }
  if (tableName === "cssd_dm_hoa_chat") {
    row = normalizeDmHoaChat(row);
  }
  if (tableName === "mdm_nhan_su") {
    const resolved = await resolveNhanSuParentIdsForImport(supabase, row, nhanSuDmSessionCache);
    if (!resolved.ok) return { ok: false, error: `Dòng ${rowNumber || "?"}: ${resolved.error}` };
    row = resolved.row;
    try {
      const hs = row;
      hs["khoa_id"] = await normalizeAndValidateDmKhoaPhong({
        supabase,
        idRaw: hs["khoa_id"],
        fieldLabel: "Khoa phòng",
      });
      await validateDanhMucIdByType({
        supabase,
        id: (hs["to_id"] as string | null) || null,
        maLoai: "TO_CONG_TAC",
        fieldLabel: "Tổ công tác",
      });
      await validateDanhMucIdByType({
        supabase,
        id: (hs["chuc_vu_id"] as string | null) || null,
        maLoai: LOAI_CHUC_VU,
        fieldLabel: "Chức vụ",
      });
      await validateDanhMucIdByType({
        supabase,
        id: (hs["chuc_danh_id"] as string | null) || null,
        maLoai: LOAI_CHUC_DANH,
        fieldLabel: "Chức danh",
      });
      await validateDanhMucIdByType({
        supabase,
        id: (hs["vai_tro_he_thong_id"] as string | null) || null,
        maLoai: LOAI_VAI_TRO_HE_THONG_KSNK,
        fieldLabel: "Vai trò KSNK",
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, error: `Dòng ${rowNumber || "?"}: ${msg}` };
    }
  }
  return { ok: true, row };
}

/** Gọi addResolvedLoaiValues trước pipeline theo bảng. */
export async function withResolvedLoaiValues(
  supabase: SupabaseClient,
  rest: Record<string, unknown>,
  fixedValues?: Record<string, unknown>,
) {
  return addResolvedLoaiValues(supabase, { ...rest, ...(fixedValues || {}) });
}
