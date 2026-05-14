"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import { verifyPermission, hasRBACAdminSupervisionBypass } from "@/lib/server-permission";

/**
 * Luồng nghiệp vụ (nhận việc, gia hạn) — CRUD form dùng `cong-viec.actions` (`createCongViec` / `updateCongViec`).
 */

/**
 * Người phụ trách xác nhận đã nhận nhiệm vụ.
 */
export async function xacNhanDaNhanCongViec(id: string) {
  await verifyPermission("CONG_VIEC", "view");
  const supabase = createAdminSupabaseClient();
  const actorNhanSuId = await getActorNhanSuId();

  const { data: cur, error: fetchErr } = await supabase
    .from("fact_cong_viec")
    .select("id, trang_thai, is_active, nguoi_phu_trach_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !cur) throw new Error("Không tìm thấy công việc.");

  const adminBypass = await hasRBACAdminSupervisionBypass();
  const isAssignee =
    Boolean(actorNhanSuId && cur.nguoi_phu_trach_id) &&
    String(actorNhanSuId) === String(cur.nguoi_phu_trach_id);
  if (!adminBypass && !isAssignee) {
    await verifyPermission("CONG_VIEC", "edit");
  }

  const canAccept =
    cur.trang_thai === "CHO_NHAN_VIEC" ||
    (cur.trang_thai === "CHUA_BAT_DAU" && cur.is_active && cur.nguoi_phu_trach_id);

  if (!canAccept) {
    throw new Error("Công việc không ở trạng thái chờ nhận nhiệm vụ.");
  }

  const { data: updated, error } = await supabase
    .from("fact_cong_viec")
    .update({
      trang_thai: "DANG_THUC_HIEN",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("trang_thai", cur.trang_thai as string)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!updated) {
    throw new Error("Không cập nhật được trạng thái (đã nhận việc trước đó hoặc trạng thái đã đổi).");
  }

  await supabase.from("fact_cong_viec_hoat_dong").insert({
    id_cong_viec: id,
    loai_hoat_dong: "CAP_NHAT",
    nguoi_thuc_hien_id: actorNhanSuId,
    noi_dung: "Đã xác nhận nhận nhiệm vụ",
  });

  revalidatePath("/quan-ly-cong-viec");
  return { success: true as const };
}

/**
 * Gia hạn hạn hoàn thành (cấp trên).
 */
export async function giaHanCongViec(id: string, hanMoi: string, lyDo: string) {
  await verifyPermission("CONG_VIEC", "edit");
  const supabase = createAdminSupabaseClient();
  const actorNhanSuId = await getActorNhanSuId();

  const { error } = await supabase
    .from("fact_cong_viec")
    .update({
      han_hoan_thanh: hanMoi,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  await supabase.from("fact_cong_viec_hoat_dong").insert({
    id_cong_viec: id,
    loai_hoat_dong: "CAP_NHAT",
    nguoi_thuc_hien_id: actorNhanSuId,
    noi_dung: `Gia hạn hạn hoàn thành: ${lyDo}`,
  });

  revalidatePath("/quan-ly-cong-viec");
  return { success: true as const };
}
