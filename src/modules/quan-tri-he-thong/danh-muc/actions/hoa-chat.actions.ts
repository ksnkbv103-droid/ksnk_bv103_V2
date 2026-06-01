"use server";

import { verifyPermission } from "@/lib/server-permission";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
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
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("v_cssd_hoa_chat_full")
    .select("*")
    .order("is_active", { ascending: false })
    .order("ma_hoa_chat", { ascending: true });

  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: data as HoaChatRow[] };
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
  const ma = String(input.ma_hoa_chat || "").trim().toUpperCase();
  const ten = String(input.ten_hoa_chat || "").trim();

  if (!ma || !ten) {
    return { success: false as const, error: "Thiếu mã hoặc tên hóa chất." };
  }

  const specs = {
    quy_cach: String(input.quy_cach || "").trim() || null,
    nong_do: String(input.nong_do || "").trim() || null,
    ghi_chu: String(input.ghi_chu || "").trim() || null,
  };

  const payload = {
    ma_hoa_chat: ma,
    ten_hoa_chat: ten,
    loai_hoa_chat: String(input.loai_hoa_chat || "HOA_CHAT").trim() || "HOA_CHAT",
    don_vi_tinh: String(input.don_vi_tinh || "").trim() || null,
    han_su_dung: parseDateOnly(input.han_su_dung),
    specs,
    is_active: input.is_active !== false,
    updated_at: new Date().toISOString(),
  };

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
