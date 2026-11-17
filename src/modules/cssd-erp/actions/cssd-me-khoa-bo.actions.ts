"use server";

import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyCssdBatchView } from "@/lib/cssd-server-gates";
import { groupMeBoByKhoa, type MeKhoaGroup } from "../lib/cssd-me-khoa-bo";

type QtRow = {
  ma_qr_quy_trinh: string | null;
  khoa_nhan_id: string | null;
  bo: { ma_bo: string | null; ten_bo: string | null } | null;
  khoa: { ten_khoa: string | null } | null;
};

/** Chỉ đọc: mẻ → nơi nhận (khoa / phòng mổ) + các bộ. Dùng khi BI dương để gọi điện thu hồi. */
export async function getMeKhoaBoAction(loTietKhuanId: string): Promise<
  { success: true; groups: MeKhoaGroup[] } | { success: false; error: string }
> {
  try {
    await verifyCssdBatchView();
    const id = z.string().uuid("Mã mẻ không hợp lệ.").parse(loTietKhuanId);
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("cssd_fact_quy_trinh")
      .select(
        "ma_qr_quy_trinh, khoa_nhan_id, bo:cssd_dm_bo_dung_cu(ma_bo, ten_bo), khoa:mdm_dm_khoa_phong(ten_khoa)",
      )
      .eq("lo_tiet_khuan_id", id)
      .eq("is_active", true)
      .limit(500);
    if (error) {
      console.error({ module: "cssd", action: "getMeKhoaBo", error: error.message });
      throw new Error("Không tải được danh sách khoa.");
    }
    const rows = ((data || []) as unknown as QtRow[]).map((r) => ({
      maBo: String(r.bo?.ma_bo || r.ma_qr_quy_trinh || "?"),
      tenBo: String(r.bo?.ten_bo || "—"),
      khoaNhanId: r.khoa_nhan_id,
      khoaTen: r.khoa?.ten_khoa ?? null,
    }));
    return { success: true, groups: groupMeBoByKhoa(rows) };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Không tải được danh sách khoa." };
  }
}
