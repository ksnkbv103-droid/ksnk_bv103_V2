"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import { hasRBACAdminSupervisionBypass, verifyPermission } from "@/lib/server-permission";
import { buildQlcvDmPersistFields } from "../lib/qlcv-persist-dm-fields";
import { qlcvWorkflowMaFromViewRow } from "../lib/qlcv-workflow-read";
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
        .from("v_fact_cong_viec_full")
        .select("id, nguoi_phu_trach_id, trang_thai")
        .eq("id", input.id_cong_viec)
        .maybeSingle();
      if (te || !task) throw new Error("Không tìm thấy công việc.");
      taskTrangThaiForStatus = qlcvWorkflowMaFromViewRow(task).trang_thai;

      const st = taskTrangThaiForStatus;
      if (st === "CHO_DUYET" || st === "CHO_XAC_NHAN_HOAN_THANH") {
        throw new Error("Việc đang chờ nghiệm thu — không ghi tiến độ tại đây.");
      }
      const isAssignee =
        Boolean(actorNhanSuId && task.nguoi_phu_trach_id) &&
        String(actorNhanSuId) === String(task.nguoi_phu_trach_id);
      const assigneeMayUpdateProgress =
        isAssignee &&
        (st === "DANG_LAM" ||
          st === "TU_CHOI" ||
          st === "DANG_THUC_HIEN" ||
          st === "CHO_NHAN_VIEC" ||
          (st === "MOI" && Boolean(task.nguoi_phu_trach_id)) ||
          (st === "CHUA_BAT_DAU" && Boolean(task.nguoi_phu_trach_id)));

      if (!assigneeMayUpdateProgress) {
        await verifyPermission("CONG_VIEC", "edit");
      }
    } else {
      const { data: taskMeta } = await supabase
        .from("v_fact_cong_viec_full")
        .select("trang_thai")
        .eq("id", input.id_cong_viec)
        .maybeSingle();
      taskTrangThaiForStatus = taskMeta ? qlcvWorkflowMaFromViewRow(taskMeta).trang_thai : null;
    }
  }

  if (input.phan_tram_hoan_thanh !== undefined) {
    const pct = Number(input.phan_tram_hoan_thanh);
    if (pct >= 100) {
      const { data: children, error: cErr } = await supabase
        .from("v_fact_cong_viec_full")
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
    if (stMoi) {
      const tt = await buildQlcvDmPersistFields(supabase, { trang_thai: stMoi });
      updateData.trang_thai_id = tt.trang_thai_id;
    }

    const { error: taskUpdateErr } = await supabase
      .from("fact_cong_viec")
      .update(updateData)
      .eq("id", input.id_cong_viec);
    if (taskUpdateErr) {
      console.error("Lỗi cập nhật tiến độ công việc:", taskUpdateErr);
      throw new Error("Không thể cập nhật tiến độ công việc: " + taskUpdateErr.message);
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

  // Roll-up tiến độ cho công việc cha nếu có
  if (input.phan_tram_hoan_thanh !== undefined) {
    const { data: curTask } = await supabase
      .from("fact_cong_viec")
      .select("cong_viec_cha_id")
      .eq("id", input.id_cong_viec)
      .maybeSingle();

    if (curTask?.cong_viec_cha_id) {
      await rollUpParentProgress(supabase, curTask.cong_viec_cha_id, actorNhanSuId);
    }
  }

  revalidatePath("/quan-ly-cong-viec");
  return hoatDong;
}

/**
 * Tự động tính toán lại tiến độ công việc cha dựa trên các công việc con đang active.
 * Đệ quy nâng lên các cấp cha cao hơn nếu có.
 */
export async function rollUpParentProgress(
  supabase: any,
  parentTaskId: string,
  actorId: string | null
): Promise<void> {
  // 1. Lấy thông tin tất cả công việc con của parentTaskId đang hoạt động (is_active = true)
  const { data: children, error: chErr } = await supabase
    .from("fact_cong_viec")
    .select("id, phan_tram_hoan_thanh")
    .eq("cong_viec_cha_id", parentTaskId)
    .eq("is_active", true);

  if (chErr) {
    console.error("Lỗi lấy danh sách việc con để roll-up:", chErr);
    return;
  }

  if (!children || children.length === 0) return;

  // 2. Tính trung bình cộng tiến độ của các việc con
  const totalProgress = children.reduce((acc: number, c: any) => acc + Number(c.phan_tram_hoan_thanh ?? 0), 0);
  const avgProgress = Math.round(totalProgress / children.length);

  // 3. Lấy thông tin công việc cha hiện tại
  const { data: parent, error: pErr } = await supabase
    .from("v_fact_cong_viec_full")
    .select("id, trang_thai, trang_thai_id, phan_tram_hoan_thanh, cong_viec_cha_id")
    .eq("id", parentTaskId)
    .maybeSingle();

  if (pErr || !parent) {
    console.error("Không tìm thấy công việc cha để cập nhật roll-up:", pErr);
    return;
  }

  const oldProgress = Number(parent.phan_tram_hoan_thanh ?? 0);
  if (oldProgress === avgProgress) {
    // Không có sự thay đổi về tiến độ, dừng đệ quy
    return;
  }

  // 4. Tính toán trạng thái mới cho công việc cha
  const updateData: Record<string, any> = {
    phan_tram_hoan_thanh: avgProgress,
    updated_at: new Date().toISOString(),
  };

  const stMoi = trangThaiCongViecSauBaoCaoTienDo(avgProgress, parent.trang_thai);
  if (stMoi) {
    const tt = await buildQlcvDmPersistFields(supabase, { trang_thai: stMoi });
    updateData.trang_thai_id = tt.trang_thai_id;
  }

  // 5. Cập nhật công việc cha
  const { error: updateErr } = await supabase
    .from("fact_cong_viec")
    .update(updateData)
    .eq("id", parentTaskId);

  if (updateErr) {
    console.error("Lỗi cập nhật tiến độ công việc cha:", updateErr);
    return;
  }

  // 6. Ghi log hoạt động cho việc cha
  await supabase.from("fact_cong_viec_hoat_dong").insert({
    id_cong_viec: parentTaskId,
    loai_hoat_dong: "BAO_CAO_TIEN_DO",
    nguoi_thuc_hien_id: actorId,
    noi_dung: `Hệ thống tự động đồng bộ tiến độ đạt ${avgProgress}% từ các công việc con.`,
    phan_tram_hoan_thanh: avgProgress,
  });

  // 7. Đệ quy lên cấp cha cao hơn nếu có
  if (parent.cong_viec_cha_id) {
    await rollUpParentProgress(supabase, parent.cong_viec_cha_id, actorId);
  }
}
