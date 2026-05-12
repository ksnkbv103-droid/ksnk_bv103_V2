"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "../../actions/verify-permission";
import { getAllRegistryEntries } from "@/lib/master-data/domain-registry";

/** Thống kê một bảng master trên Trung tâm Danh mục. */
export type DanhMucStat = { count: number; last?: string };

/** Payload `data` khi `getTrungTamDanhMucStatsAction` thành công. */
export type TrungTamDanhMucStatsPayload = Record<
  "loai" | "bo" | "le" | "tb" | "hc" | "khoa" | "ns" | "bk" | "tk",
  DanhMucStat
> & {
  /** Đếm theo từng `loaiDanhMuc` trong domain-registry (tab Danh mục chuyên biệt). */
  registryByLoai?: Record<string, DanhMucStat>;
};

/** Thống kê nhanh cho Trung tâm Danh mục (chỉ đếm bảng dm_* / master — không còn hub). */
export async function getTrungTamDanhMucStatsAction(options?: { includeRegistry?: boolean }) {
  try {
    await verifyPermission("DANH_MUC", "view");
    const supabase = createAdminSupabaseClient();
    const getS = async (
      table: string,
      options?: {
        filter?: { k: string; v: string };
        activeOnly?: boolean;
      }
    ): Promise<DanhMucStat> => {
      // Đổi mặc định sang false để đếm TỔNG số lượng (đúng thực tế quản trị hơn)
      const activeOnly = options?.activeOnly === true;
      const idColumn = table === "v_auth_user_permissions" ? "auth_user_id" : "id";
      const hasTimestamps = table !== "v_auth_user_permissions";
      let countQuery = supabase.from(table).select(idColumn, { count: "exact", head: true });
      let lastQuery = hasTimestamps
        ? supabase
            .from(table)
            .select("updated_at, created_at")
            .order("updated_at", { ascending: false })
            .limit(1)
        : null;

      if (options?.filter) {
        countQuery = countQuery.eq(options.filter.k, options.filter.v);
        if (lastQuery) lastQuery = lastQuery.eq(options.filter.k, options.filter.v);
      }
      if (activeOnly) {
        countQuery = countQuery.eq("is_active", true);
        if (lastQuery) lastQuery = lastQuery.eq("is_active", true);
      }
      const [{ count, error: cErr }, lastRes] = await Promise.all([
        countQuery,
        lastQuery ? lastQuery : Promise.resolve({ data: null, error: null }),
      ]);
      const data = (lastRes as { data?: unknown }).data;
      const lErr = (lastRes as { error?: unknown }).error;
      if (cErr || lErr) {
        console.error(`Stats error for ${table}:`, cErr || lErr);
        return { count: 0 };
      }
      type TimeRow = { updated_at?: string | null; created_at?: string | null };
      const rows = Array.isArray(data) ? (data as TimeRow[]) : [];
      const row = rows[0] || null;
      const last = row?.updated_at || row?.created_at || undefined;
      return { count: count || 0, last };
    };

    const includeRegistry = options?.includeRegistry === true;
    const registryEntries = includeRegistry ? getAllRegistryEntries() : [];
    const registryPairsPromises = includeRegistry
      ? registryEntries.map(async (e) => {
          try {
            const s = await getS(e.sourceTable, { activeOnly: false });
            return [e.loaiDanhMuc, s] as const;
          } catch {
            return [e.loaiDanhMuc, { count: 0, last: undefined } satisfies DanhMucStat] as const;
          }
        })
      : [];
    const khuVucStatPromise = includeRegistry ? null : getS("dm_khu_vuc_giam_sat", { activeOnly: false });

    const flat = await Promise.all([
      getS("dm_loai_dung_cu", { activeOnly: false }),
      getS("dm_bo_dung_cu", { activeOnly: false }),
      getS("dm_bo_dung_cu_chi_tiet", { activeOnly: false }),
      getS("dm_thiet_bi", { activeOnly: false }),
      getS("dm_hoa_chat", { activeOnly: false }),
      getS("dm_khoa_phong", { activeOnly: false }),
      getS("mdm_nhan_su", { activeOnly: false }),
      getS("dm_bang_kiem", { activeOnly: false }),
      getS("v_auth_user_permissions"), // Đếm số tài khoản thực tế
      ...(khuVucStatPromise ? [khuVucStatPromise] : []),
      ...registryPairsPromises,
    ]);

    const [loai, bo, le, tb, hc, khoa, ns, bk, tk] = flat.slice(0, 9) as [
      DanhMucStat,
      DanhMucStat,
      DanhMucStat,
      DanhMucStat,
      DanhMucStat,
      DanhMucStat,
      DanhMucStat,
      DanhMucStat,
      DanhMucStat,
    ];
    const registryByLoai: Record<string, DanhMucStat> = {};
    if (includeRegistry) {
      const registryPairs = flat.slice(9) as readonly (readonly [string, DanhMucStat])[];
      Object.assign(registryByLoai, Object.fromEntries(registryPairs) as Record<string, DanhMucStat>);
    } else {
      const khuVucStat = flat[9] as DanhMucStat | undefined;
      if (khuVucStat) registryByLoai.KHU_VUC_GIAM_SAT = khuVucStat;
    }

    return { success: true, data: { loai, bo, le, tb, hc, khoa, ns, bk, tk, registryByLoai } };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
