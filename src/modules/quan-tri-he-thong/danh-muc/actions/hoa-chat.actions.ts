"use server";

import { verifyPermission } from "@/lib/server-permission";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import {
  softDeleteManyMasterRows,
  softDeleteMasterRow,
  toggleMasterStatus,
  upsertMasterRow,
} from "./master-crud-core";
import { z } from "zod";
import { isVatTuLoai } from "@/lib/domain/cssd-hoa-chat-loai";
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

const nhomIdSchema = z.string().trim().uuid("Nhóm không hợp lệ.").nullable();

/** Kiểm nhóm tồn tại, đang dùng (trừ khi giữ nguyên nhóm cũ của dòng) và cùng loại. */
async function checkNhomId(
  nhomId: string,
  loai: string,
  giuNhomCu: string | null,
): Promise<string | null> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("cssd_dm_hoa_chat_nhom")
    .select("id, loai_hoa_chat, is_active")
    .eq("id", nhomId)
    .maybeSingle();
  if (error) return error.message;
  if (!data) return "Nhóm không tồn tại.";
  if (data.loai_hoa_chat !== loai) return "Nhóm không cùng loại với hóa chất / vật tư đã chọn.";
  if (!data.is_active && nhomId !== giuNhomCu) return "Nhóm đã ngừng sử dụng, hãy chọn nhóm khác.";
  return null;
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

  const nhomParsed = nhomIdSchema.safeParse(String(input.nhom_id ?? "").trim() || null);
  if (!nhomParsed.success) {
    return { success: false as const, error: nhomParsed.error.issues[0]?.message || "Nhóm không hợp lệ." };
  }
  const nhomId = nhomParsed.data;
  const loai = isVatTuLoai(String(input.loai_hoa_chat ?? "")) ? "VAT_TU" : "HOA_CHAT";
  if (nhomId) {
    let nhomCu: string | null = null;
    if (id) {
      const { data: cu } = await createAdminSupabaseClient()
        .from("cssd_dm_hoa_chat")
        .select("nhom_id")
        .eq("id", id)
        .maybeSingle();
      nhomCu = (cu?.nhom_id as string | null) ?? null;
    }
    const err = await checkNhomId(nhomId, loai, nhomCu);
    if (err) return { success: false as const, error: err };
  }

  const specs = {
    quy_cach: String(input.quy_cach || "").trim() || null,
    nong_do: String(input.nong_do || "").trim() || null,
    ghi_chu: String(input.ghi_chu || "").trim() || null,
  };

  const payload = {
    ma_hoa_chat: ma,
    ten_hoa_chat: ten,
    loai_hoa_chat: loai,
    nhom_id: nhomId,
    don_vi_tinh: String(input.don_vi_tinh || "").trim() || null,
    han_su_dung: parseDateOnly(input.han_su_dung),
    specs,
    is_active: input.is_active !== false,
    updated_at: new Date().toISOString(),
  };

  return upsertMasterRow("cssd_dm_hoa_chat", id, payload);
}

export async function toggleHoaChatStatusAction(id: string, currentStatus: boolean) {
  await verifyPermission("HOA_CHAT", "edit");
  return toggleMasterStatus("cssd_dm_hoa_chat", id, currentStatus);
}

export async function softDeleteHoaChatAction(id: string) {
  await verifyPermission("HOA_CHAT", "delete");
  return softDeleteMasterRow("cssd_dm_hoa_chat", id);
}

export async function softDeleteManyHoaChatAction(ids: string[]) {
  await verifyPermission("HOA_CHAT", "delete");
  return softDeleteManyMasterRows("cssd_dm_hoa_chat", ids);
}
