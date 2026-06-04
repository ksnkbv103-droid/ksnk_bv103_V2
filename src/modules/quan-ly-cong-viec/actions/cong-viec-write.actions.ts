"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import { verifyQlcvDeleteCapability } from "../lib/qlcv-rbac";
import { assertQlcvRowInListScope, resolveQlcvListScope } from "../lib/qlcv-list-scope";
import { isChoNghiemThuHoanThanh } from "../lib/qlcv-workflow-display";
import { qlcvWorkflowMaFromViewRow } from "../lib/qlcv-workflow-read";
import { updateCongViecTrangThaiByMa } from "../lib/qlcv-workflow-mutate";

/** Đóng phiếu `DA_HUY` khi không đạt (không xóa bản ghi). */
export async function huyKhiChoNghiemThuKhongDat(id: string, lyDo: string) {
  const supabase = createAdminSupabaseClient();
  const actorNhanSuId = await getActorNhanSuId();
  const reason = lyDo.trim();
  if (!reason) throw new Error("Nhập lý do hủy do không đạt.");

  await verifyQlcvDeleteCapability();
  const scope = await resolveQlcvListScope(supabase);

  const { data: cur, error: fetchErr } = await supabase
    .from("v_qlcv_cong_viec_full")
    .select(
      "id, trang_thai, phan_tram_hoan_thanh, han_hoan_thanh, is_qua_han, is_active, nguoi_phu_trach_id, nguoi_tao_id, khoa_thuc_hien_id",
    )
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !cur) throw new Error("Không tìm thấy công việc.");

  assertQlcvRowInListScope(
    {
      khoa_thuc_hien_id: cur.khoa_thuc_hien_id,
      nguoi_phu_trach_id: cur.nguoi_phu_trach_id,
      nguoi_tao_id: cur.nguoi_tao_id,
    },
    scope,
  );

  const st = qlcvWorkflowMaFromViewRow(cur).trang_thai;
  const pct = Number(cur.phan_tram_hoan_thanh ?? 0);

  const canHuy = st !== "HOAN_THANH" && st !== "DA_HUY";
  if (!canHuy) {
    throw new Error("Công việc đã hoàn thành hoặc đã hủy.");
  }

  const { updated } = await updateCongViecTrangThaiByMa(supabase, {
    id,
    currentTrangThaiMa: cur.trang_thai ? String(cur.trang_thai) : null,
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

  await supabase.from("qlcv_fact_cong_viec_hoat_dong").insert({
    id_cong_viec: id,
    loai_hoat_dong: "CAP_NHAT",
    nguoi_thuc_hien_id: actorNhanSuId,
    noi_dung: noiDung,
    phan_tram_hoan_thanh: pct,
  });

  revalidatePath("/quan-ly-cong-viec");
  return { success: true as const };
}
