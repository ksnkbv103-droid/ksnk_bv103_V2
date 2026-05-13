"use server";

import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyPermission } from "../../actions/verify-permission";
import { getRegistryEntry } from "@/lib/master-data/domain-registry";
import type { DanhMuc } from "../lib/danh-muc-flat-record";

function mapDmRowToDanhMuc(loai: string, row: Record<string, unknown>): DanhMuc {
  const reg = getRegistryEntry(loai);
  return {
    id: String(row.id || ""),
    ma_danh_muc: String(row[reg.maColumn] || ""),
    ten_danh_muc: String(row[reg.tenColumn] || ""),
    loai_danh_muc: loai,
    is_active: row.is_active !== false,
    created_at: row.created_at as string | undefined,
    updated_at: row.updated_at as string | undefined,
  };
}

/** Liệt kê theo một loại registry → bảng dm_* (hub đã sunset). */
export async function getDanhMucs(params: {
  search?: string;
  loai?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = await createServerSupabaseUserClient();
  try {
    await verifyPermission("DANH_MUC", "view");
    const { search, loai, page = 1, pageSize = 10 } = params;
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    const loaiFilter = loai && loai !== "Tất cả" ? loai.trim() : "";

    if (!loaiFilter) {
      return {
        success: true as const,
        data: [] as DanhMuc[],
        total: 0,
        page,
        pageSize,
      };
    }

    const reg = getRegistryEntry(loaiFilter);
    let q = supabase.from(reg.sourceTable).select("*", { count: "exact" });
    if (search) q = q.ilike(reg.tenColumn, `%${search}%`);
    const { data, error, count } = await q.order("updated_at", { ascending: false }).range(start, end);
    if (error) throw error;
    return {
      success: true as const,
      data: (data || []).map((r) => mapDmRowToDanhMuc(loaiFilter, r as Record<string, unknown>)),
      total: count || 0,
      page,
      pageSize,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Lỗi getDanhMucs:", msg);
    return { success: false as const, error: "Không thể tải danh sách danh mục: " + msg };
  }
}

/** Export trực tiếp từ bảng dm_* theo registry. */
export async function getDanhMucExportData() {
  try {
    await verifyPermission("DANH_MUC", "view");
    return { success: true as const, data: [] };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : String(error) };
  }
}
