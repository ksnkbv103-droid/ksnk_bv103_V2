"use server";

import { verifyPermission } from "@/lib/server-permission";
import {
  listMasterRows,
  softDeleteManyMasterRows,
  softDeleteMasterRow,
  toggleMasterStatus,
  upsertMasterRow,
} from "./master-crud-core";
import type { HoaChatRow } from "./hoa-chat.types";

export async function getHoaChatRowsAction() {
  await verifyPermission("HOA_CHAT", "view");
  const result = await listMasterRows("dm_hoa_chat", "ma_hoa_chat");
  if (!result.success) return result;
  return { success: true as const, data: result.data as HoaChatRow[] };
}

function parseDateOnly(value: unknown): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export async function saveHoaChatAction(input: Record<string, unknown>) {
  const id = String(input.id || "").trim();
  await verifyPermission("HOA_CHAT", id ? "edit" : "create");
  const payload = {
    ma_hoa_chat: String(input.ma_hoa_chat || "").trim().toUpperCase(),
    ten_hoa_chat: String(input.ten_hoa_chat || "").trim(),
    loai_hoa_chat: String(input.loai_hoa_chat || "HOA_CHAT").trim() || "HOA_CHAT",
    don_vi_tinh: String(input.don_vi_tinh || "").trim() || null,
    quy_cach: String(input.quy_cach || "").trim() || null,
    nong_do: String(input.nong_do || "").trim() || null,
    han_su_dung: parseDateOnly(input.han_su_dung),
    ghi_chu: String(input.ghi_chu || "").trim() || null,
    is_active: input.is_active !== false,
    updated_at: new Date().toISOString(),
  };
  if (!payload.ma_hoa_chat || !payload.ten_hoa_chat) {
    return { success: false as const, error: "Thiếu mã hoặc tên hóa chất." };
  }
  return upsertMasterRow("dm_hoa_chat", id, payload);
}

export async function toggleHoaChatStatusAction(id: string, currentStatus: boolean) {
  await verifyPermission("HOA_CHAT", "edit");
  return toggleMasterStatus("dm_hoa_chat", id, currentStatus);
}

export async function softDeleteHoaChatAction(id: string) {
  await verifyPermission("HOA_CHAT", "delete");
  return softDeleteMasterRow("dm_hoa_chat", id);
}

export async function softDeleteManyHoaChatAction(ids: string[]) {
  await verifyPermission("HOA_CHAT", "delete");
  return softDeleteManyMasterRows("dm_hoa_chat", ids);
}
