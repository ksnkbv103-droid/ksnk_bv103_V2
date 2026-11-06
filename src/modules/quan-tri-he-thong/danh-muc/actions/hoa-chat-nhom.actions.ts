"use server";

import { z } from "zod";
import { verifyPermission, hasRBACAdminSupervisionBypass } from "@/lib/server-permission";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { logAdminAction } from "@/lib/admin-audit";
import { maNhomKhongTrung, sinhMaNhom } from "@/lib/domain/cssd-hoa-chat-nhom";
import type { HoaChatNhomRow } from "./hoa-chat.types";

const COLS = "id, ma, ten, loai_hoa_chat, thu_tu, is_active";
const NOT_ADMIN = "Chỉ quản trị viên được quản lý nhóm.";

const loaiSchema = z.enum(["HOA_CHAT", "VAT_TU"], { message: "Loại không hợp lệ." });
const tenSchema = z.string().trim().min(1, "Tên nhóm không được trống.").max(100, "Tên nhóm tối đa 100 ký tự.");
const maSchema = z
  .string()
  .trim()
  .max(50, "Mã nhóm tối đa 50 ký tự.")
  .optional();
const thuTuSchema = z.number({ message: "Thứ tự phải là số." }).int("Thứ tự phải là số nguyên.").min(0).max(100000);
const idSchema = z.string().trim().uuid("Nhóm không hợp lệ.");

function firstErr(e: z.ZodError) {
  return e.issues[0]?.message || "Dữ liệu không hợp lệ.";
}

function dbErr(error: { code?: string; message: string }) {
  if (error.code === "23505") return "Tên nhóm (hoặc mã) đã tồn tại trong loại này.";
  return error.message;
}

async function requireAdmin(): Promise<boolean> {
  return hasRBACAdminSupervisionBypass();
}

/** Danh sách nhóm. Người có quyền xem: chỉ nhóm đang dùng; ADMIN: gồm cả nhóm ngừng. */
export async function listHoaChatNhomAction(loai?: string) {
  await verifyPermission("HOA_CHAT", "view");
  const admin = await requireAdmin();
  let q = createAdminSupabaseClient()
    .from("cssd_dm_hoa_chat_nhom")
    .select(COLS)
    .order("loai_hoa_chat")
    .order("thu_tu")
    .order("ten");
  if (loai) {
    const p = loaiSchema.safeParse(loai);
    if (!p.success) return { success: false as const, error: firstErr(p.error) };
    q = q.eq("loai_hoa_chat", p.data);
  }
  if (!admin) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: (data ?? []) as HoaChatNhomRow[] };
}

export async function createHoaChatNhomAction(input: { ten: string; loai_hoa_chat: string; ma?: string; thu_tu?: number }) {
  await verifyPermission("HOA_CHAT", "view");
  if (!(await requireAdmin())) return { success: false as const, error: NOT_ADMIN };
  const parsed = z
    .object({ ten: tenSchema, loai_hoa_chat: loaiSchema, ma: maSchema, thu_tu: thuTuSchema.optional() })
    .safeParse(input);
  if (!parsed.success) return { success: false as const, error: firstErr(parsed.error) };
  const { ten, loai_hoa_chat, thu_tu } = parsed.data;
  const supabase = createAdminSupabaseClient();

  let ma = (parsed.data.ma || "").toUpperCase();
  if (!ma) {
    const { data: all } = await supabase.from("cssd_dm_hoa_chat_nhom").select("ma");
    ma = maNhomKhongTrung(sinhMaNhom(ten), (all ?? []).map((r) => String(r.ma)));
  }
  let thuTu = thu_tu;
  if (thuTu === undefined) {
    const { data: last } = await supabase
      .from("cssd_dm_hoa_chat_nhom")
      .select("thu_tu")
      .eq("loai_hoa_chat", loai_hoa_chat)
      .lt("thu_tu", 999)
      .order("thu_tu", { ascending: false })
      .limit(1);
    thuTu = Number(last?.[0]?.thu_tu ?? 0) + 10;
  }
  const { data, error } = await supabase
    .from("cssd_dm_hoa_chat_nhom")
    .insert({ ma, ten, loai_hoa_chat, thu_tu: thuTu })
    .select(COLS)
    .single();
  if (error) return { success: false as const, error: dbErr(error) };
  await logAdminAction({
    action: "MASTER_CREATE",
    targetTable: "cssd_dm_hoa_chat_nhom",
    targetId: data.id,
    after: data,
  });
  return { success: true as const, data: data as HoaChatNhomRow };
}

/** Sửa tên và/hoặc thứ tự (không đổi loại, không đổi mã). */
export async function updateHoaChatNhomAction(id: string, patch: { ten?: string; thu_tu?: number }) {
  await verifyPermission("HOA_CHAT", "view");
  if (!(await requireAdmin())) return { success: false as const, error: NOT_ADMIN };
  const parsed = z
    .object({ id: idSchema, ten: tenSchema.optional(), thu_tu: thuTuSchema.optional() })
    .safeParse({ id, ...patch });
  if (!parsed.success) return { success: false as const, error: firstErr(parsed.error) };
  const { id: nid, ...fields } = parsed.data;
  if (fields.ten === undefined && fields.thu_tu === undefined) {
    return { success: false as const, error: "Không có gì để cập nhật." };
  }
  const { data, error } = await createAdminSupabaseClient()
    .from("cssd_dm_hoa_chat_nhom")
    .update(fields)
    .eq("id", nid)
    .select(COLS);
  if (error) return { success: false as const, error: dbErr(error) };
  if (!data?.length) return { success: false as const, error: "Nhóm không tồn tại." };
  await logAdminAction({
    action: "MASTER_UPDATE",
    targetTable: "cssd_dm_hoa_chat_nhom",
    targetId: nid,
    after: data[0],
  });
  return { success: true as const, data: data[0] as HoaChatNhomRow };
}

/** Ngừng sử dụng (is_active=false) hoặc khôi phục (true). Không xóa cứng. */
export async function setHoaChatNhomActiveAction(id: string, isActive: boolean) {
  await verifyPermission("HOA_CHAT", "view");
  if (!(await requireAdmin())) return { success: false as const, error: NOT_ADMIN };
  const parsed = z.object({ id: idSchema, isActive: z.boolean() }).safeParse({ id, isActive });
  if (!parsed.success) return { success: false as const, error: firstErr(parsed.error) };
  const { data, error } = await createAdminSupabaseClient()
    .from("cssd_dm_hoa_chat_nhom")
    .update({ is_active: parsed.data.isActive })
    .eq("id", parsed.data.id)
    .select(COLS);
  if (error) {
    return {
      success: false as const,
      error: error.code === "23505" ? "Đã có nhóm đang dùng cùng tên trong loại này, đổi tên trước khi khôi phục." : error.message,
    };
  }
  if (!data?.length) return { success: false as const, error: "Nhóm không tồn tại." };
  await logAdminAction({
    action: isActive ? "MASTER_RESTORE" : "MASTER_SOFT_DELETE",
    targetTable: "cssd_dm_hoa_chat_nhom",
    targetId: parsed.data.id,
    after: { is_active: parsed.data.isActive },
  });
  return { success: true as const, data: data[0] as HoaChatNhomRow };
}
