"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import {
  softDeleteManySafeRows,
  softDeleteSafeRow,
  toggleSafeStatus,
  upsertSafeRow,
} from "../../actions/master-crud-safe-core";
import { verifyPermission } from "../../actions/verify-permission";

function errBk(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

/** Đọc chuỗi từ payload form (đã normalize client). */
function str(r: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return undefined;
}

export async function saveBangKiem(data: Record<string, unknown>) {
  try {
    const idRaw = data.id;
    const idEarly = typeof idRaw === "string" ? idRaw : "";
    await verifyPermission("BANG_KIEM", idEarly ? "edit" : "create");
    const payload = {
      ma_bk: str(data, "ma_bk", "ma_bang_kiem"),
      ten_bang_kiem: str(data, "ten_bang_kiem", "ten_bk"),
      mo_ta: (data.mo_ta as string | null | undefined) ?? null,
      nhom_chuyen_de: (data.nhom_chuyen_de as string | null | undefined) ?? null,
      loai_hinh_giam_sat: str(data, "loai_hinh_giam_sat") || "TRUC_TIEP",
      is_active: typeof data.is_active === "boolean" ? data.is_active : true,
      is_system: typeof data.is_system === "boolean" ? data.is_system : false,
      updated_at: new Date().toISOString(),
    };
    const id = typeof idRaw === "string" ? idRaw : "";
    const result = await upsertSafeRow("dm_bang_kiem", id, payload);
    if (!result.success) throw new Error(result.error);
    revalidatePath("/quan-tri-he-thong");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: errBk(error) };
  }
}

export async function deleteBangKiem(id: string) {
  try {
    await verifyPermission("BANG_KIEM", "delete");
    const result = await softDeleteSafeRow("dm_bang_kiem", id);
    if (!result.success) throw new Error(result.error);
    revalidatePath("/quan-tri-he-thong");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: errBk(error) };
  }
}

export async function saveTieuChi(data: Record<string, unknown>) {
  try {
    const idRawEarly = data.id;
    const idEarly = typeof idRawEarly === "string" ? idRawEarly : "";
    await verifyPermission("BANG_KIEM_DETAIL", idEarly ? "edit" : "create");
    const bangKiemId =
      (typeof data.bangKiemId === "string" && data.bangKiemId) ||
      (typeof data.bang_kiem_id === "string" && data.bang_kiem_id) ||
      "";
    const stt = typeof data.stt === "number" ? data.stt : Number(data.stt);
    const payload = {
      bang_kiem_id: bangKiemId,
      stt: Number.isFinite(stt) ? stt : 0,
      ma_tc: (data.ma_tc as string | null | undefined) ?? null,
      noi_dung: typeof data.noi_dung === "string" ? data.noi_dung : "",
      ghi_chu: (data.ghi_chu as string | null | undefined) ?? null,
      diem_toi_da:
        typeof data.diem_toi_da === "number"
          ? data.diem_toi_da
          : Number(data.diem_toi_da) || 1,
      is_active: typeof data.is_active === "boolean" ? data.is_active : true,
      updated_at: new Date().toISOString(),
    };
    const result = await upsertSafeRow("dm_tieu_chi_bang_kiem", idEarly, payload);
    if (!result.success) throw new Error(result.error);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: errBk(error) };
  }
}

export async function deleteTieuChi(_bangKiemId: string, tcId: string) {
  try {
    await verifyPermission("BANG_KIEM_DETAIL", "delete");
    const result = await softDeleteSafeRow("dm_tieu_chi_bang_kiem", tcId);
    if (!result.success) throw new Error(result.error);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: errBk(error) };
  }
}

export async function importTieuChis(bangKiemId: string, newCriteria: Record<string, unknown>[]) {
  try {
    await verifyPermission("BANG_KIEM_DETAIL", "import");
    const supabase = createAdminSupabaseClient();
    const payload = (newCriteria || []).map((nc) => ({
      bang_kiem_id: bangKiemId,
      stt: typeof nc.stt === "number" ? nc.stt : Number(nc.stt),
      ma_tc: nc.ma_tc as string | undefined,
      noi_dung: typeof nc.noi_dung === "string" ? nc.noi_dung : "",
      ghi_chu: nc.ghi_chu as string | undefined,
      is_active: true
    }));
    const { error } = await supabase.from("dm_tieu_chi_bang_kiem").insert(payload);
    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: errBk(error) };
  }
}

export async function deleteMultipleTieuChis(ids: string[]) {
  try {
    await verifyPermission("BANG_KIEM_DETAIL", "delete");
    const result = await softDeleteManySafeRows("dm_tieu_chi_bang_kiem", ids);
    if (!result.success) throw new Error(result.error);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: errBk(error) };
  }
}

export async function toggleIsActive(
  table: "dm_bang_kiem" | "dm_tieu_chi_bang_kiem",
  id: string,
  currentStatus: boolean,
) {
  try {
    await verifyPermission(table === "dm_bang_kiem" ? "BANG_KIEM" : "BANG_KIEM_DETAIL", "edit");
    const result = await toggleSafeStatus(table, id, currentStatus);
    if (!result.success) throw new Error(result.error);
    revalidatePath("/quan-tri-he-thong");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: errBk(error) };
  }
}

export async function reorderTieuChis(bangKiemId: string) {
  try {
    await verifyPermission("BANG_KIEM_DETAIL", "edit");
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase.rpc("rpc_reorder_tieu_chi_bang_kiem", {
      p_bang_kiem_id: bangKiemId,
    });
    if (error) throw error;
    revalidatePath("/quan-tri-he-thong");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: errBk(error) };
  }
}
