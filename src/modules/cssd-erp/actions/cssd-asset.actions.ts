"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { insertCssdLifecycleEvent } from "../shared/application/cssd-lifecycle-events";
import { mapFkError, revalidateCssdInventorySurfaces, tableHasColumn } from "./cssd-action-common";

/**
 * Điều chuyển cấu phần giữa hai QR đang hoạt động — ghi `fact_cssd_dieu_chuyen_thanh_phan` + lifecycle.
 */
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

    const hasAudit = await tableHasColumn(supabase, "fact_cssd_dieu_chuyen_thanh_phan", "tu_quy_trinh_id");

    const { data: tu, error: eTu } = await supabase
      .from("fact_quy_trinh")
      .select("*")
      .eq("ma_qr_quy_trinh", maTu)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: den, error: eDen } = await supabase
      .from("fact_quy_trinh")
      .select("*")
      .eq("ma_qr_quy_trinh", maDen)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (eTu || eDen) return { success: false, error: mapFkError((eTu || eDen)?.message) };
    if (!tu || !den) return { success: false, error: "Không đọc được quy trình nguồn/đích." };

    const tuId = String((tu as { id?: string }).id || "");
    const denId = String((den as { id?: string }).id || "");

    const { data: lineTuRaw, error: lErr } = await supabase
      .from("fact_quy_trinh_thanh_phan")
      .select("*")
      .eq("quy_trinh_id", tuId)
      .eq("ten_dung_cu_le", ten)
      .eq("is_active", true)
      .maybeSingle();
    if (lErr) return { success: false, error: lErr.message };
    const lineTu = lineTuRaw as {
      id?: string;
      so_luong_thuc_te?: number | null;
      so_luong_ke_hoach?: number | null;
      dm_bo_dung_cu_chi_tiet_id?: string | null;
    } | null;
    if (!lineTu?.id || lineTu.so_luong_thuc_te == null) return { success: false, error: "Không tìm thấy cấu phần trên bộ nguồn." };

    const thuc = Number(lineTu.so_luong_thuc_te ?? 0);
    if (thuc < n) return { success: false, error: `Không đủ số lượng thực tế trên nguồn (còn ${thuc}).` };

    const { error: uTuErr } = await supabase
      .from("fact_quy_trinh_thanh_phan")
      .update({ so_luong_thuc_te: thuc - n, updated_at: new Date().toISOString() })
      .eq("id", lineTu.id);
    if (uTuErr) return { success: false, error: uTuErr.message };

    const { data: lineDenRaw } = await supabase
      .from("fact_quy_trinh_thanh_phan")
      .select("*")
      .eq("quy_trinh_id", denId)
      .eq("ten_dung_cu_le", ten)
      .eq("is_active", true)
      .maybeSingle();
    const lineDen = lineDenRaw as {
      id?: string;
      so_luong_thuc_te?: number | null;
      so_luong_ke_hoach?: number | null;
    } | null;

    const keHoachCu = Number(lineTu.so_luong_ke_hoach ?? lineDen?.so_luong_ke_hoach ?? n);

    if (lineDen?.id) {
      const denThuc = Number(lineDen.so_luong_thuc_te ?? 0);
      const { error: uDe } = await supabase
        .from("fact_quy_trinh_thanh_phan")
        .update({ so_luong_thuc_te: denThuc + n, updated_at: new Date().toISOString() })
        .eq("id", lineDen.id);
      if (uDe) return { success: false, error: uDe.message };
    } else {
      const ins = {
        quy_trinh_id: denId,
        dm_bo_dung_cu_chi_tiet_id: lineTu.dm_bo_dung_cu_chi_tiet_id ?? null,
        ten_dung_cu_le: ten,
        so_luong_ke_hoach: keHoachCu,
        so_luong_thuc_te: n,
        is_active: true,
        updated_at: new Date().toISOString(),
      };
      const { error: insErr } = await supabase.from("fact_quy_trinh_thanh_phan").insert(ins);
      if (insErr) return { success: false, error: insErr.message };
    }

    if (hasAudit) {
      await supabase.from("fact_cssd_dieu_chuyen_thanh_phan").insert({
        tu_quy_trinh_id: tuId,
        den_quy_trinh_id: denId,
        ten_dung_cu_le: ten,
        so_luong: n,
        dm_bo_dung_cu_chi_tiet_id: lineTu.dm_bo_dung_cu_chi_tiet_id ?? null,
        ghi_chu: payload.ghiChu ?? null,
        is_active: true,
        updated_at: new Date().toISOString(),
      });
    }

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
