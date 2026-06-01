"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import { hasRBACAdminSupervisionBypass } from "@/lib/server-permission";
import { isChoNghiemThuHoanThanh } from "../lib/qlcv-workflow-display";
import { qlcvWorkflowMaFromViewRow } from "../lib/qlcv-workflow-read";
import { updateCongViecTrangThaiByMa } from "../lib/qlcv-workflow-mutate";

/** Đóng phiếu `DA_HUY` khi không đạt (không xóa bản ghi). */
export async function huyKhiChoNghiemThuKhongDat(id: string, lyDo: string) {
  const supabase = createAdminSupabaseClient();
  const actorNhanSuId = await getActorNhanSuId();
  const reason = lyDo.trim();
  if (!reason) throw new Error("Nhập lý do hủy do không đạt.");

  const { data: cur, error: fetchErr } = await supabase
    .from("v_qlcv_cong_viec_full")
    .select("id, trang_thai, trang_thai_id, phan_tram_hoan_thanh, han_hoan_thanh, is_qua_han, is_active, nguoi_phu_trach_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !cur) throw new Error("Không tìm thấy công việc.");

  const st = qlcvWorkflowMaFromViewRow(cur).trang_thai;
  const pct = Number(cur.phan_tram_hoan_thanh ?? 0);

  const adminBypass = await hasRBACAdminSupervisionBypass();
  if (!adminBypass) {
    throw new Error("Chỉ có quản trị viên hoặc chỉ huy khoa mới được quyền hủy công việc.");
  }

  const canHuy = st !== "HOAN_THANH" && st !== "DA_HUY";
  if (!canHuy) {
    throw new Error("Công việc đã hoàn thành hoặc đã hủy.");
  }

  const { updated } = await updateCongViecTrangThaiByMa(supabase, {
    id,
    currentTrangThaiId: cur.trang_thai_id ? String(cur.trang_thai_id) : null,
    nextMa: "DA_HUY",
  });

  if (!updated) throw new Error("Không cập nhật được (trạng thái đã đổi).");

  const rowSnapshot = {
    trang_thai: st,
    is_active: cur.is_active,
    nguoi_phu_trach_id: cur.nguoi_phu_trach_id,
    phan_tram_hoan_thanh: cur.phan_tram_hoan_thanh,
    han_hoan_thanh: cur.han_hoan_thanh,
    is_qua_han: cur.is_qua_han,
  };
  const inGate = isChoNghiemThuHoanThanh(rowSnapshot);
  const noiDung = inGate
    ? `Hủy do không đạt khi nghiệm thu: ${reason}`
    : `Hủy công việc: ${reason}`;

  await supabase.from("fact_cong_viec_hoat_dong").insert({
    id_cong_viec: id,
    loai_hoat_dong: "CAP_NHAT",
    nguoi_thuc_hien_id: actorNhanSuId,
    noi_dung: noiDung,
    phan_tram_hoan_thanh: pct,
  });

  revalidatePath("/quan-ly-cong-viec");
  return { success: true as const };
}
