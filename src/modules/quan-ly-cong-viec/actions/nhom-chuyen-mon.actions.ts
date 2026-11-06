"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hasRBACAdminSupervisionBypass } from "@/lib/server-permission";
import { logAdminAction } from "@/lib/admin-audit";
import { ensureQlcvKsnkAccess } from "../lib/qlcv-action-guard";
import type { NhomChuyenMonRow } from "../types";

const TABLE = "qlcv_dm_nhom_chuyen_mon";
const COLS = "id, ma, ten, thu_tu, is_active";
const NOT_ADMIN = "Chỉ quản trị viên được quản lý nhóm chuyên môn.";

const tenSchema = z.string().trim().min(1, "Tên nhóm không được trống.").max(100, "Tên nhóm tối đa 100 ký tự.");
const thuTuSchema = z.number({ message: "Thứ tự phải là số." }).int().min(0).max(100000);
const idSchema = z.string().trim().uuid("Nhóm không hợp lệ.");

function firstErr(e: z.ZodError) {
  return e.issues[0]?.message || "Dữ liệu không hợp lệ.";
}

function dbErr(error: { code?: string; message: string }) {
  if (error.code === "23505") return "Tên nhóm (hoặc mã) đã tồn tại.";
  return error.message;
}

/** Mã nhóm sinh từ tên: bỏ dấu, hoa, gạch dưới; thêm hậu tố nếu trùng. */
function sinhMa(ten: string, existed: Set<string>): string {
  const base =
    ten
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/gi, "d")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "NHOM";
  let ma = base;
  for (let i = 2; existed.has(ma); i++) ma = `${base}_${i}`;
  return ma;
}

/** Danh sách nhóm. Người xem: nhóm đang dùng; ADMIN: gồm cả nhóm ngừng. */
export async function listNhomChuyenMonAction() {
  const { supabase } = await ensureQlcvKsnkAccess("view");
  const admin = await hasRBACAdminSupervisionBypass();
  let q = supabase.from(TABLE).select(COLS).order("thu_tu").order("ten");
  if (!admin) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: (data ?? []) as NhomChuyenMonRow[] };
}

export async function createNhomChuyenMonAction(input: { ten: string; thu_tu?: number }) {
  const { supabase } = await ensureQlcvKsnkAccess("view");
  if (!(await hasRBACAdminSupervisionBypass())) return { success: false as const, error: NOT_ADMIN };
  const parsed = z.object({ ten: tenSchema, thu_tu: thuTuSchema.optional() }).safeParse(input);
  if (!parsed.success) return { success: false as const, error: firstErr(parsed.error) };

  const { data: all } = await supabase.from(TABLE).select("ma, thu_tu");
  const existed = new Set((all ?? []).map((r) => String(r.ma)));
  const maxThuTu = Math.max(0, ...(all ?? []).map((r) => Number(r.thu_tu) || 0));
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ ma: sinhMa(parsed.data.ten, existed), ten: parsed.data.ten, thu_tu: parsed.data.thu_tu ?? maxThuTu + 10 })
    .select(COLS)
    .single();
  if (error) return { success: false as const, error: dbErr(error) };
  await logAdminAction({ action: "MASTER_CREATE", targetTable: TABLE, targetId: data.id });
  revalidatePath("/quan-ly-cong-viec");
  return { success: true as const, data: data as NhomChuyenMonRow };
}

/** Sửa tên và/hoặc thứ tự (không đổi mã). */
export async function updateNhomChuyenMonAction(id: string, patch: { ten?: string; thu_tu?: number }) {
  const { supabase } = await ensureQlcvKsnkAccess("view");
  if (!(await hasRBACAdminSupervisionBypass())) return { success: false as const, error: NOT_ADMIN };
  const parsed = z
    .object({ id: idSchema, ten: tenSchema.optional(), thu_tu: thuTuSchema.optional() })
    .safeParse({ id, ...patch });
  if (!parsed.success) return { success: false as const, error: firstErr(parsed.error) };
  const { id: nid, ...fields } = parsed.data;
  if (fields.ten === undefined && fields.thu_tu === undefined) {
    return { success: false as const, error: "Không có gì để cập nhật." };
  }
  const { data, error } = await supabase.from(TABLE).update(fields).eq("id", nid).select(COLS);
  if (error) return { success: false as const, error: dbErr(error) };
  if (!data?.length) return { success: false as const, error: "Nhóm không tồn tại." };
  await logAdminAction({ action: "MASTER_UPDATE", targetTable: TABLE, targetId: nid });
  revalidatePath("/quan-ly-cong-viec");
  return { success: true as const, data: data[0] as NhomChuyenMonRow };
}

/** Ngừng sử dụng (is_active=false) hoặc khôi phục. Không xóa cứng. */
export async function setNhomChuyenMonActiveAction(id: string, isActive: boolean) {
  const { supabase } = await ensureQlcvKsnkAccess("view");
  if (!(await hasRBACAdminSupervisionBypass())) return { success: false as const, error: NOT_ADMIN };
  const parsed = z.object({ id: idSchema, isActive: z.boolean() }).safeParse({ id, isActive });
  if (!parsed.success) return { success: false as const, error: firstErr(parsed.error) };
  const { data, error } = await supabase
    .from(TABLE)
    .update({ is_active: parsed.data.isActive })
    .eq("id", parsed.data.id)
    .select(COLS);
  if (error) {
    return {
      success: false as const,
      error: error.code === "23505" ? "Đã có nhóm đang dùng cùng tên, đổi tên trước khi khôi phục." : error.message,
    };
  }
  if (!data?.length) return { success: false as const, error: "Nhóm không tồn tại." };
  await logAdminAction({
    action: isActive ? "MASTER_RESTORE" : "MASTER_SOFT_DELETE",
    targetTable: TABLE,
    targetId: parsed.data.id,
  });
  revalidatePath("/quan-ly-cong-viec");
  return { success: true as const, data: data[0] as NhomChuyenMonRow };
}
