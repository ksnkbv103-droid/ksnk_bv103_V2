"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyAnyPermission, verifyPermission } from "@/lib/server-permission";
import { z } from "zod";
import { getErrorMessage, mapFkError, revalidateCssdInventorySurfaces } from "./cssd-action-common";
import { buildSupabaseSearchFilter } from "@/lib/supabase-search-helper";
import { bootstrapCssdQuyTrinhFromBoId } from "../shared/application/cssd-bo-bootstrap";

async function verifyCanRegisterPhysicalLabel(): Promise<void> {
  // Một round-trip: OR của 3 quyền ghi.
  await verifyAnyPermission([
    { moduleKey: "CSSD_KHO_DUNGCU", action: "create" },
    { moduleKey: "CSSD_WORKFLOW", action: "create" },
    { moduleKey: "CSSD_WORKFLOW", action: "edit" },
  ]);
}

async function verifyCanReadBoListForCssd(): Promise<void> {
  const checks: Array<[string, string]> = [
    ["CSSD_KHO_DUNGCU", "view"],
    ["CSSD_KHO_DUNGCU", "edit"],
    ["CSSD_KHO_DUNGCU", "create"],
    ["CSSD_KHO_DUNGCU", "import"],
    ["CSSD_WORKFLOW", "view"],
  ];
  for (const [moduleKey, action] of checks) {
    try {
      await verifyPermission(moduleKey, action);
      return;
    } catch {
      /* try next permission candidate */
    }
  }
  await verifyPermission("CSSD_KHO_DUNGCU", "view");
}

/** Danh sách bộ đang hoạt động để đăng ký nhãn QR (đọc từ `cssd_dm_bo_dung_cu`). */
export async function listActiveBoDungCuForCssdLabel(search?: string): Promise<
  { success: true; data: { id: string; ten_bo: string; ma_bo: string | null }[] } | { success: false; error: string }
> {
  try {
    await verifyCanReadBoListForCssd();
    const supabase = createAdminSupabaseClient();
    let q = supabase
      .from("cssd_dm_bo_dung_cu")
      .select("id, ten_bo, ma_bo")
      .eq("is_active", true)
      .order("ma_bo", { ascending: true });

    const searchFilter = buildSupabaseSearchFilter(search, ["ten_bo", "ma_bo"]);
    if (searchFilter) q = q.or(searchFilter);

    const { data, error } = await q;
    if (error) return { success: false, error: mapFkError(error.message) };
    const rows = (data || []).map((r: { id?: string; ten_bo?: string; ma_bo?: string | null }) => ({
      id: String(r.id || ""),
      ten_bo: String(r.ten_bo || "").trim() || "—",
      ma_bo: r.ma_bo != null ? String(r.ma_bo).trim() : null,
    }));
    return { success: true, data: rows.filter((x) => x.id) };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) };
  }
}

/**
 * Tạo/cập nhật quy_trinh — mã quét = ma_bo (SSOT, vd. B01.SET.01).
 */
export async function registerPhysicalBoLabelFromDmAction(boDungCuId: string): Promise<
  | {
      success: true;
      ma_vach_qr: string;
      ten_bo: string;
      bo_id: string;
      ten_khoa: string | null;
      tong_so_luong_dung_cu: number | null;
      so_khoan: number | null;
      phan_loai_bo: string | null;
    }
  | { success: false; error: string }
> {
  try {
    await verifyCanRegisterPhysicalLabel();
    const supabase = createAdminSupabaseClient();
    const boIdParsed = z.string().trim().min(1).uuid().safeParse(String(boDungCuId ?? ""));
    if (!boIdParsed.success) return { success: false, error: "Thiếu hoặc sai định dạng bộ dụng cụ (danh mục)." };
    const boId = boIdParsed.data;

    const boot = await bootstrapCssdQuyTrinhFromBoId(supabase, boId);
    revalidateCssdInventorySurfaces();

    return {
      success: true,
      ma_vach_qr: boot.ma_vach_qr,
      ten_bo: boot.ten_bo,
      bo_id: boot.bo_id,
      ten_khoa: boot.ten_khoa ?? null,
      tong_so_luong_dung_cu: boot.tong_so_luong_dung_cu ?? null,
      so_khoan: boot.so_khoan ?? null,
      phan_loai_bo: boot.phan_loai_bo ?? null,
    };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) };
  }
}

