// src/modules/quan-tri-he-thong/danh-muc/actions/export.actions.ts
"use server";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { getRegistryModuleForMasterTable } from "./master-table-permission-map";
/** Xuất đầy đủ để có ma_khoi/ma_* — anon client có thể bị RLS chặn, dùng service (cùng cơ chế action master khác). */

type ExportFilters = Record<string, string | number | boolean>;

export async function getMasterDataExport(
  tableName: string,
  orderBy: string = "created_at",
  filters?: ExportFilters
) {
  const exportModule = getRegistryModuleForMasterTable(tableName);
  if (!exportModule) {
    return { success: false, error: `Chưa map quyền xuất dữ liệu cho bảng: ${tableName}` };
  }
  await verifyPermission(exportModule, "view");
  const supabase = createAdminSupabaseClient();
  try {
    let query = supabase.from(tableName).select("*");
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    const { data, error } = await query.order(orderBy);
    if (error) throw error;
    const rows = (data || []) as Record<string, unknown>[];
    if (tableName === "mdm_dm_khoa_phong") {
      const khoiIds = Array.from(
        new Set(rows.map((x) => String(x.khoi_id || "").trim()).filter(Boolean))
      );
      if (khoiIds.length === 0) return { success: true, data: rows };
      const { data: khoiData, error: khoiErr } = await supabase
        .from("mdm_dm_khoi_khoa")
        .select("id, ma_khoi, ten_khoi")
        .in("id", khoiIds);
      if (khoiErr) throw khoiErr;
      const khoiMap = new Map(
        (khoiData || []).map((x: { id?: string; ma_khoi?: string; ten_khoi?: string }) => [String(x.id), x] as const)
      );
      return {
        success: true,
        data: rows.map((x) => {
          const specs = (x.specs as Record<string, unknown> | null) || {};
          const khoi = khoiMap.get(String(x.khoi_id || ""));
          return {
            ma_khoa: x.ma_khoa,
            ten_khoa: x.ten_khoa,
            ma_khoi: khoi?.ma_khoi || null,
            ten_khoi: khoi?.ten_khoi || null,
            mo_ta_chuc_nang: specs.mo_ta_chuc_nang ?? null,
            so_bac_si: specs.so_bac_si ?? 0,
            so_dieu_duong: specs.so_dieu_duong ?? 0,
            so_giuong_benh_thuong: specs.so_giuong_benh_thuong ?? 0,
            so_giuong_cap_cuu: specs.so_giuong_cap_cuu ?? 0,
            is_active: x.is_active !== false,
          };
        }),
      };
    }
    if (tableName === "cssd_dm_bo_dung_cu") {
      const loaiIds = Array.from(
        new Set(rows.map((x) => String(x.loai_dung_cu_id || "").trim()).filter(Boolean))
      );
      const khoaIds = Array.from(
        new Set(rows.map((x) => String(x.khoa_su_dung_id || "").trim()).filter(Boolean))
      );
      const [loaiRes, khoaRes] = await Promise.all([
        loaiIds.length
          ? supabase.from("cssd_dm_loai_dung_cu").select("id, ma_loai_dung_cu, ten_loai_dung_cu").in("id", loaiIds)
          : Promise.resolve({ data: [], error: null }),
        khoaIds.length
          ? supabase
              .from("mdm_dm_khoa_phong")
              .select("id, ma_khoa, ten_khoa")
              .in("id", khoaIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (loaiRes.error) throw loaiRes.error;
      if (khoaRes.error) throw khoaRes.error;
      const loaiMap = new Map(
        (loaiRes.data || []).map(
          (x: { id?: string; ma_loai_dung_cu?: string; ten_loai_dung_cu?: string }) =>
            [String(x.id), { id: x.id, ma_danh_muc: x.ma_loai_dung_cu, ten_danh_muc: x.ten_loai_dung_cu }] as const,
        )
      );
      const khoaMap = new Map(
        (khoaRes.data || []).map((x: { id?: string; ma_khoa?: string; ten_khoa?: string }) =>
          [String(x.id), x] as const,
        ),
      );
      return {
        success: true,
        data: rows.map((x) => ({
          ...x,
          ma_loai_dung_cu: loaiMap.get(String(x.loai_dung_cu_id || ""))?.ma_danh_muc || null,
          ten_loai_dung_cu: loaiMap.get(String(x.loai_dung_cu_id || ""))?.ten_danh_muc || null,
          ma_khoa_su_dung: khoaMap.get(String(x.khoa_su_dung_id || ""))?.ma_khoa || null,
          ten_khoa_su_dung: khoaMap.get(String(x.khoa_su_dung_id || ""))?.ten_khoa || null,
        })),
      };
    }
    return { success: true, data: rows };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
