"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { insertCssdLifecycleEvent } from "../shared/application/cssd-lifecycle-events";
import { transferBomLineBetweenQuyTrinh } from "../shared/application/cssd-quy-trinh-bom";
import { mapFkError, revalidateCssdInventorySurfaces } from "./cssd-action-common";

/** Điều chuyển cấu phần giữa hai QR — cập nhật metadata.bom_lines + audit ngoai_le. */
export async function dieuChuyenThanhPhanGiuaHaiQrAction(payload: {
  maQrTu: string;
  maQrDen: string;
  tenDungCuLe: string;
  soLuong: number;
  ghiChu?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyPermission("CSSD_KHO_DUNGCU", "edit");
    const ten = String(payload.tenDungCuLe || "").trim();
    const n = Math.floor(Number(payload.soLuong || 0));
    if (!ten || n < 1) return { success: false, error: "Thiếu tên cấu phần hoặc số lượng không hợp lệ." };

    const maTu = String(payload.maQrTu || "").trim().toUpperCase();
    const maDen = String(payload.maQrDen || "").trim().toUpperCase();
    if (!maTu || !maDen || maTu === maDen) return { success: false, error: "Hai mã QR nguồn/đích phải khác nhau." };

    const { data: tu, error: eTu } = await supabase
      .from("cssd_fact_quy_trinh")
      .select("id")
      .eq("ma_qr_quy_trinh", maTu)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: den, error: eDen } = await supabase
      .from("cssd_fact_quy_trinh")
      .select("id")
      .eq("ma_qr_quy_trinh", maDen)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (eTu || eDen) return { success: false, error: mapFkError((eTu || eDen)?.message) };
    if (!tu || !den) return { success: false, error: "Không đọc được quy trình nguồn/đích." };

    const tuId = String((tu as { id?: string }).id || "");
    const denId = String((den as { id?: string }).id || "");

    const moved = await transferBomLineBetweenQuyTrinh(supabase, {
      tuQuyTrinhId: tuId,
      denQuyTrinhId: denId,
      tenDungCuLe: ten,
      soLuong: n,
    });
    if (!moved.ok) return { success: false, error: moved.message };

    const lcPayload = {
      ma_qr_tu: maTu,
      ma_qr_den: maDen,
      ten_dung_cu_le: ten,
      so_luong: n,
      ghi_chu: payload.ghiChu,
    };

    await insertCssdLifecycleEvent(supabase, {
      quy_trinh_id: tuId,
      ma_su_kien: "DIEU_CHUYEN_THANH_PHAN_RA",
      ghi_chu: `Điều → ${maDen}`,
      payload: lcPayload,
    });
    await insertCssdLifecycleEvent(supabase, {
      quy_trinh_id: denId,
      ma_su_kien: "DIEU_CHUYEN_THANH_PHAN_VAO",
      ghi_chu: `Nhận từ ${maTu}`,
      payload: lcPayload,
    });

    revalidateCssdInventorySurfaces();
    return { success: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e || "Loi khong ro");
    return { success: false, error: msg };
  }
}
