"use server";

import { z } from "zod";
import { verifyPermission } from "@/lib/server-permission";
import { getActorKsnkScope } from "@/lib/actor-ksnk-scope-server";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { KE_HOACH_CHI_TIEU_MAC_DINH, toThangDauThang, type KeHoachTienDoRow } from "@/lib/analytics/ke-hoach-giam-sat";

const loaiSchema = z.enum(["VST", "GSC"]);
const thangSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .transform((v, ctx) => {
    const t = toThangDauThang(v);
    if (!t) ctx.addIssue({ code: "custom", message: "Tháng không hợp lệ" });
    return t ?? "";
  });
const readSchema = z.object({ thang: thangSchema, loai: loaiSchema });
const writeSchema = readSchema.extend({ khoaId: z.string().uuid(), active: z.boolean() });

async function requireView(loai: "VST" | "GSC") {
  await verifyPermission(loai === "VST" ? "GIAM_SAT_VST" : "GIAM_SAT_CHUNG", "view");
}

export type KeHoachTienDoResult =
  | { success: true; rows: KeHoachTienDoRow[]; canEdit: boolean }
  | { success: false; error: string };

/** Đọc tiến độ. service_role bypass RLS → tự lọc khoa: admin/KSNK thấy tất cả, người khác chỉ khoa mình. */
export async function getKeHoachTienDo(input: { thang: string; loai: "VST" | "GSC" }): Promise<KeHoachTienDoResult> {
  const parsed = readSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Tham số không hợp lệ" };
  const { thang, loai } = parsed.data;
  await requireView(loai);

  const scope = await getActorKsnkScope();
  const full = scope.isAdmin || scope.isNhanVienKsnk;
  if (!full && !scope.actorKhoaId) return { success: true, rows: [], canEdit: false };

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.rpc("fn_gstt_ke_hoach_tien_do", {
    p_thang: thang,
    p_loai: loai,
    p_chi_tieu: KE_HOACH_CHI_TIEU_MAC_DINH,
  });
  if (error) {
    console.error("ke-hoach-giam-sat.getKeHoachTienDo", { module: "giam-sat-hub", action: "getKeHoachTienDo", error: error.message });
    return { success: false, error: "Không tải được kế hoạch giám sát" };
  }
  let rows = ((data ?? []) as KeHoachTienDoRow[]).map((r) => ({
    khoa_id: String(r.khoa_id),
    chi_tieu: Number(r.chi_tieu),
    so_phien: Number(r.so_phien),
    ty_le_hoan_thanh: Number(r.ty_le_hoan_thanh),
    dat: Boolean(r.dat),
  }));
  if (!full) rows = rows.filter((r) => r.khoa_id === scope.actorKhoaId);
  return { success: true, rows, canEdit: full };
}

/** Lập (active=true) hoặc bỏ (is_active=false, không DELETE) kế hoạch khoa/tháng. Chỉ admin/KSNK. */
export async function setKeHoachKhoa(input: {
  thang: string;
  loai: "VST" | "GSC";
  khoaId: string;
  active: boolean;
}): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = writeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Tham số không hợp lệ" };
  const { thang, loai, khoaId, active } = parsed.data;
  await requireView(loai);

  const scope = await getActorKsnkScope();
  if (!(scope.isAdmin || scope.isNhanVienKsnk)) return { success: false, error: "Không có quyền lập kế hoạch" };

  const supabase = createAdminSupabaseClient();
  if (active) {
    const { data: ex, error: e1 } = await supabase
      .from("gstt_fact_ke_hoach_giam_sat")
      .select("id")
      .eq("khoa_id", khoaId)
      .eq("thang", thang)
      .eq("loai", loai)
      .eq("is_active", true)
      .maybeSingle();
    if (e1) return fail("setKeHoachKhoa.select", e1.message);
    if (ex) return { success: true };
    const { error } = await supabase
      .from("gstt_fact_ke_hoach_giam_sat")
      .insert({ khoa_id: khoaId, thang, loai, is_active: true, nguoi_lap_id: scope.actorNhanSuId });
    // 23505 = đã có (đua ghi) → coi như thành công
    if (error && error.code !== "23505") return fail("setKeHoachKhoa.insert", error.message);
    return { success: true };
  }
  const { error } = await supabase
    .from("gstt_fact_ke_hoach_giam_sat")
    .update({ is_active: false })
    .eq("khoa_id", khoaId)
    .eq("thang", thang)
    .eq("loai", loai)
    .eq("is_active", true);
  if (error) return fail("setKeHoachKhoa.update", error.message);
  return { success: true };
}

function fail(action: string, message: string) {
  console.error("ke-hoach-giam-sat", { module: "giam-sat-hub", action, error: message });
  return { success: false as const, error: "Không lưu được kế hoạch giám sát" };
}
