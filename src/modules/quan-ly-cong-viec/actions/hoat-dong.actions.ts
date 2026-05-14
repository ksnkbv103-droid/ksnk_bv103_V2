"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import { hasRBACAdminSupervisionBypass, verifyPermission } from "@/lib/server-permission";
import { trangThaiCongViecSauBaoCaoTienDo } from "../lib/qlcv-trang-thai-after-bao-cao-tien-do";

interface CreateHoatDongInput {
  id_cong_viec: string;
  loai_hoat_dong:
    | "PHAN_CONG"
    | "DE_XUAT"
    | "BAO_CAO_TIEN_DO"
    | "PHE_DUYET"
    | "CAP_NHAT"
    | "HOAN_THANH"
    | "XAC_NHAN_NHAN"
    | "DUYET_HOAN_THANH"
    | "TU_CHOI_HOAN_THANH"
    | "GIA_HAN";
  noi_dung?: string;
  phan_tram_hoan_thanh?: number;
}

/**
 * Ghi nhận hoạt động cho công việc (không upload file — ngoài phạm vi module).
 */
export async function createHoatDong(input: CreateHoatDongInput) {
  await verifyPermission("CONG_VIEC", "view");
  const supabase = createAdminSupabaseClient();
  const actorNhanSuId = await getActorNhanSuId();

  let taskTrangThaiForStatus: string | null = null;

  if (input.phan_tram_hoan_thanh !== undefined) {
    const adminBypass = await hasRBACAdminSupervisionBypass();
    if (!adminBypass) {
      const { data: task, error: te } = await supabase
        .from("fact_cong_viec")
        .select("id, nguoi_phu_trach_id, trang_thai")
        .eq("id", input.id_cong_viec)
        .maybeSingle();
      if (te || !task) throw new Error("Không tìm thấy công việc.");
      taskTrangThaiForStatus = task.trang_thai != null ? String(task.trang_thai) : null;

      const st = String(task.trang_thai || "");
      const isAssignee =
        Boolean(actorNhanSuId && task.nguoi_phu_trach_id) &&
        String(actorNhanSuId) === String(task.nguoi_phu_trach_id);
      const assigneeMayUpdateProgress =
        isAssignee &&
        (st === "DANG_THUC_HIEN" ||
          st === "CHO_NHAN_VIEC" ||
          (st === "CHUA_BAT_DAU" && Boolean(task.nguoi_phu_trach_id)));

      if (!assigneeMayUpdateProgress) {
        await verifyPermission("CONG_VIEC", "edit");
      }
    } else {
      const { data: taskMeta } = await supabase
        .from("fact_cong_viec")
        .select("trang_thai")
        .eq("id", input.id_cong_viec)
        .maybeSingle();
      taskTrangThaiForStatus = taskMeta?.trang_thai != null ? String(taskMeta.trang_thai) : null;
    }
  }

  const { data: hoatDong, error: hdError } = await supabase
    .from("fact_cong_viec_hoat_dong")
    .insert({
      id_cong_viec: input.id_cong_viec,
      loai_hoat_dong: input.loai_hoat_dong,
      noi_dung: input.noi_dung,
      phan_tram_hoan_thanh: input.phan_tram_hoan_thanh ?? 0,
      nguoi_thuc_hien_id: actorNhanSuId,
    })
    .select()
    .single();

  if (hdError) {
    console.error("Lỗi ghi nhận hoạt động:", hdError);
    throw new Error("Không thể ghi nhận hoạt động: " + hdError.message);
  }

  if (input.phan_tram_hoan_thanh !== undefined) {
    const pct = Number(input.phan_tram_hoan_thanh);
    if (pct >= 100) {
      const { data: children, error: cErr } = await supabase
        .from("fact_cong_viec")
        .select("id, trang_thai")
        .eq("cong_viec_cha_id", input.id_cong_viec);
      if (cErr) throw new Error("Không kiểm tra được việc con.");
      const blocking = (children || []).filter((c) => c.trang_thai !== "HOAN_THANH" && c.trang_thai !== "DA_HUY");
      if (blocking.length > 0) {
        throw new Error("Còn việc con chưa hoàn thành — không thể báo 100% / chờ nghiệm thu cho công việc cha.");
      }
    }

    const updateData: Record<string, unknown> = {
      phan_tram_hoan_thanh: input.phan_tram_hoan_thanh,
      updated_at: new Date().toISOString(),
    };

    const stMoi = trangThaiCongViecSauBaoCaoTienDo(input.phan_tram_hoan_thanh, taskTrangThaiForStatus);
    if (stMoi) updateData.trang_thai = stMoi;

    await supabase.from("fact_cong_viec").update(updateData).eq("id", input.id_cong_viec);
  }

  revalidatePath("/quan-ly-cong-viec");
  return hoatDong;
}
