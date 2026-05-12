"use server";

import { verifyPermission } from "@/lib/server-permission";
import { getRegistryEntryOrNull } from "@/lib/master-data/domain-registry";
import { buildMigratedUpsertPayload, buildNextDmBusinessCode } from "@/lib/master-data/danh-muc-routing";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import {
  listMasterRows,
  softDeleteMasterRow,
  softDeleteManyMasterRows,
  toggleMasterStatus,
  upsertMasterRow,
} from "./master-crud-core";

function getPermissionModuleForLoai(loaiDanhMuc: string): "DANH_MUC" | "PHAN_QUYEN" {
  // dm_roles là nền RBAC, mọi thao tác phải đi qua quyền PHAN_QUYEN.
  return loaiDanhMuc.trim() === "VAI_TRO_HE_THONG_KSNK" ? "PHAN_QUYEN" : "DANH_MUC";
}

export async function listGenericDmAction(loaiDanhMuc: string) {
  await verifyPermission(getPermissionModuleForLoai(loaiDanhMuc), "view");
  const reg = getRegistryEntryOrNull(loaiDanhMuc.trim());
  if (!reg) return { success: false as const, error: "Loại danh mục không hợp lệ." };
  return listMasterRows(reg.sourceTable, reg.maColumn);
}

/** Gợi ý mã dòng mới (DM-xxxx) dựa trên mã đang có trong bảng dm_* — dùng khi thêm danh mục chuyên biệt. */
export async function suggestNextGenericDmMaAction(loaiDanhMuc: string) {
  await verifyPermission(getPermissionModuleForLoai(loaiDanhMuc), "view");
  const reg = getRegistryEntryOrNull(loaiDanhMuc.trim());
  if (!reg) return { success: false as const, error: "Loại danh mục không hợp lệ." };
  try {
    const supabase = createAdminSupabaseClient();
    const data = await buildNextDmBusinessCode(supabase, reg);
    return { success: true as const, data };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false as const, error: msg };
  }
}

export async function upsertGenericDmAction(
  loaiDanhMuc: string,
  id: string | null,
  ma: string,
  ten: string,
  isActive: boolean
) {
  await verifyPermission(getPermissionModuleForLoai(loaiDanhMuc), id ? "edit" : "create");
  const reg = getRegistryEntryOrNull(loaiDanhMuc.trim());
  if (!reg) return { success: false as const, error: "Loại danh mục không hợp lệ." };
  const payload = buildMigratedUpsertPayload(reg, {
    ma: ma.trim(),
    ten: ten.trim(),
    isActive,
  });
  return upsertMasterRow(reg.sourceTable, id || "", payload);
}

export async function toggleGenericDmAction(loaiDanhMuc: string, id: string, currentActive: boolean) {
  await verifyPermission(getPermissionModuleForLoai(loaiDanhMuc), "edit");
  const reg = getRegistryEntryOrNull(loaiDanhMuc.trim());
  if (!reg) return { success: false as const, error: "Loại danh mục không hợp lệ." };
  return toggleMasterStatus(reg.sourceTable, id, currentActive);
}

export async function softDeleteGenericDmAction(loaiDanhMuc: string, id: string) {
  await verifyPermission(getPermissionModuleForLoai(loaiDanhMuc), "delete");
  const reg = getRegistryEntryOrNull(loaiDanhMuc.trim());
  if (!reg) return { success: false as const, error: "Loại danh mục không hợp lệ." };
  return softDeleteMasterRow(reg.sourceTable, id);
}

export async function softDeleteManyGenericDmAction(loaiDanhMuc: string, ids: string[]) {
  await verifyPermission(getPermissionModuleForLoai(loaiDanhMuc), "delete");
  const reg = getRegistryEntryOrNull(loaiDanhMuc.trim());
  if (!reg) return { success: false as const, error: "Loại danh mục không hợp lệ." };
  if (!ids.length) return { success: false as const, error: "Chưa chọn dòng." };
  return softDeleteManyMasterRows(reg.sourceTable, ids);
}
