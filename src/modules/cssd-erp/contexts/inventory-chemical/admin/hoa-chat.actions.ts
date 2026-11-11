"use server";

import { verifyPermission } from "@/lib/server-permission";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import {
  softDeleteManyMasterRows,
  softDeleteMasterRow,
  toggleMasterStatus,
  upsertMasterRow,
} from "@/lib/master-data/engine/master-crud-core";
import { z } from "zod";
import { isVatTuLoai } from "@/lib/domain/cssd-hoa-chat-loai";
import type { HoaChatRow } from "@/modules/cssd-erp/contexts/inventory-chemical/admin/hoa-chat.types";
import { detectHoaChatSensitiveChange } from "@/lib/domain/cssd-sensitive-change";
import { requireCssdSensitiveApprove } from "@/lib/master-data/require-cssd-sensitive-approve";

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

  // PO 2026-10-29: ADMIN đặt định mức tối thiểu + % cảnh báo + ngày chờ hàng. Không gửi = giữ nguyên (import không đụng).
  const canhBao: Record<string, number | null> = {};
  const soTuyChon = (k: string) => {
    const raw = input[k];
    if (raw === undefined) return undefined;
    const t = String(raw ?? "").trim();
    return t === "" ? null : Number(t);
  };
  const ng = soTuyChon("nguong_ton_toi_thieu");
  if (ng !== undefined) {
    if (ng !== null && (!Number.isFinite(ng) || ng < 0)) return { success: false as const, error: "Định mức tồn tối thiểu phải ≥ 0." };
    canhBao.nguong_ton_toi_thieu = ng;
  }
  const pct = soTuyChon("ty_le_canh_bao_pct");
  if (pct != null) {
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return { success: false as const, error: "Tỷ lệ cảnh báo phải từ 0 đến 100 (%)." };
    canhBao.ty_le_canh_bao_pct = pct;
  }
  const ngay = soTuyChon("so_ngay_cho_hang");
  if (ngay != null) {
    if (!Number.isInteger(ngay) || ngay < 0 || ngay > 365) return { success: false as const, error: "Số ngày chờ hàng phải là số nguyên từ 0 đến 365." };
    canhBao.so_ngay_cho_hang = ngay;
  }

  const payload = {
    ...canhBao,
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

  // AR-5d: thêm mới / ngừng / nồng độ / định mức cần quyền approve; đổi tên, ghi chú làm trực tiếp.
  let prev: Record<string, unknown> | null = null;
  if (id) {
    const { data: cu } = await createAdminSupabaseClient()
      .from("cssd_dm_hoa_chat")
      .select("is_active, specs, nguong_ton_toi_thieu, ty_le_canh_bao_pct, so_ngay_cho_hang")
      .eq("id", id)
      .maybeSingle();
    prev = (cu as Record<string, unknown> | null) ?? null;
  }
  const prevSpecs = (prev?.specs && typeof prev.specs === "object" ? prev.specs : {}) as { nong_do?: string | null };
  try {
    await requireCssdSensitiveApprove(
      "HOA_CHAT",
      detectHoaChatSensitiveChange(
        id && !prev ? null : id ? { ...(prev as object), nong_do: prevSpecs.nong_do } : null,
        { is_active: payload.is_active, nong_do: specs.nong_do, ...canhBao },
      ),
    );
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : "Không đủ quyền." };
  }

  return upsertMasterRow("cssd_dm_hoa_chat", id, payload);
}

export async function toggleHoaChatStatusAction(id: string, currentStatus: boolean) {
  await verifyPermission("HOA_CHAT", "edit");
  try {
    await requireCssdSensitiveApprove("HOA_CHAT", [currentStatus ? "ngừng sử dụng hóa chất" : "dùng lại hóa chất"]);
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : "Không đủ quyền." };
  }
  return toggleMasterStatus("cssd_dm_hoa_chat", id, currentStatus);
}

export async function softDeleteHoaChatAction(id: string) {
  await verifyPermission("HOA_CHAT", "delete");
  try {
    await requireCssdSensitiveApprove("HOA_CHAT", ["xóa hóa chất"]);
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : "Không đủ quyền." };
  }
  const supabase = createAdminSupabaseClient();
  const { count, error } = await supabase
    .from("cssd_fact_kho_hoa_chat_giao_dich")
    .select("id", { count: "exact", head: true })
    .eq("dm_hoa_chat_id", id);
  if (!error && count && count > 0) {
    return {
      success: false as const,
      error: `Không thể xóa hóa chất đã phát sinh ${count} giao dịch kho. Hãy chuyển trạng thái sang ngưng sử dụng.`,
    };
  }
  return softDeleteMasterRow("cssd_dm_hoa_chat", id);
}

export async function softDeleteManyHoaChatAction(ids: string[]) {
  await verifyPermission("HOA_CHAT", "delete");
  try {
    await requireCssdSensitiveApprove("HOA_CHAT", ["xóa hóa chất"]);
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : "Không đủ quyền." };
  }
  if (!ids.length) return { success: false as const, error: "Chưa chọn dòng." };
  const supabase = createAdminSupabaseClient();
  const { data: activeTx } = await supabase
    .from("cssd_fact_kho_hoa_chat_giao_dich")
    .select("id, dm_hoa_chat_id")
    .in("dm_hoa_chat_id", ids);
  if (activeTx && activeTx.length > 0) {
    return {
      success: false as const,
      error: `Có ${activeTx.length} giao dịch kho gắn với các hóa chất được chọn. Hãy chuyển sang ngưng sử dụng.`,
    };
  }
  return softDeleteManyMasterRows("cssd_dm_hoa_chat", ids);
}
