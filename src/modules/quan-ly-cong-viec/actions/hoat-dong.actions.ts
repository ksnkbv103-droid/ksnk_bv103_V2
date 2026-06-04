"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import { hasRBACAdminSupervisionBypass, verifyPermission } from "@/lib/server-permission";
import { qlcvWorkflowMaFromViewRow } from "../lib/qlcv-workflow-read";
import { isChoNghiemThuHoanThanh, isDeXuatChoDuyet } from "../lib/qlcv-workflow-display";

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
}

/**
 * Ghi nhận hoạt động / ghi chú tiến độ (không đổi % — checklist là SSOT tiến độ).
 */
export async function createHoatDong(input: CreateHoatDongInput) {
  await verifyPermission("CONG_VIEC", "view");
  const supabase = createAdminSupabaseClient();
  const actorNhanSuId = await getActorNhanSuId();

  const { data: task, error: te } = await supabase
    .from("v_qlcv_cong_viec_full")
    .select("id, nguoi_phu_trach_id, trang_thai, is_active, phan_tram_hoan_thanh")
    .eq("id", input.id_cong_viec)
    .maybeSingle();

  if (te || !task) throw new Error("Không tìm thấy công việc.");

  const wf = qlcvWorkflowMaFromViewRow(task);

  if (input.loai_hoat_dong === "BAO_CAO_TIEN_DO") {
    if (isDeXuatChoDuyet(wf)) throw new Error("Đề xuất chưa được phê duyệt.");
    if (isChoNghiemThuHoanThanh(wf)) {
      throw new Error("Việc đang chờ nghiệm thu — không ghi chú tiến độ tại đây.");
    }
    if (wf.trang_thai === "HOAN_THANH" || wf.trang_thai === "DA_HUY") {
      throw new Error("Phiếu đã đóng.");
    }

    const adminBypass = await hasRBACAdminSupervisionBypass();
    if (!adminBypass) {
      const isAssignee =
        Boolean(actorNhanSuId && task.nguoi_phu_trach_id) &&
        String(actorNhanSuId) === String(task.nguoi_phu_trach_id);
      const st = wf.trang_thai;
      const assigneeMayNote =
        isAssignee &&
        (st === "DANG_LAM" ||
          st === "TU_CHOI" ||
          st === "DANG_THUC_HIEN" ||
          st === "CHO_NHAN_VIEC" ||
          st === "QUA_HAN" ||
          ((st === "MOI" || st === "CHUA_BAT_DAU") && Boolean(task.nguoi_phu_trach_id)));

      if (!assigneeMayNote) {
        await verifyPermission("CONG_VIEC", "edit");
      }
    }
  }

  const snapshotPct = Number(task.phan_tram_hoan_thanh ?? 0);

  const { data: hoatDong, error: hdError } = await supabase
    .from("qlcv_fact_cong_viec_hoat_dong")
    .insert({
      id_cong_viec: input.id_cong_viec,
      loai_hoat_dong: input.loai_hoat_dong,
      noi_dung: input.noi_dung,
      phan_tram_hoan_thanh: snapshotPct,
      nguoi_thuc_hien_id: actorNhanSuId,
    })
    .select()
    .single();

  if (hdError) {
    console.error("Lỗi ghi nhận hoạt động:", hdError);
    throw new Error("Không thể ghi nhận hoạt động: " + hdError.message);
  }

  revalidatePath("/quan-ly-cong-viec");
  return hoatDong;
}
