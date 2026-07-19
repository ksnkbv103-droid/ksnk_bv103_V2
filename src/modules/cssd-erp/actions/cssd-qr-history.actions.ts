"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyCssdWorkflowView } from "@/lib/cssd-server-gates";
import { getErrorMessage } from "../shared/cssd-db-utils";
import { CSSD_BATCH_QR_PREFIX, classifyCssdCode } from "../shared/domain/cssd-qr-core";
import { fetchCssdBatchPrintDataByMaLo } from "./cssd-print.actions";
import { fetchActiveQuyTrinhByScanCode } from "../shared/application/cssd-workflow-resolve";

export async function fetchCssdQrHistory(maQr: string) {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyCssdWorkflowView();
    const qr = String(maQr || "").trim().toUpperCase();
    if (!qr) return { success: false as const, error: "Vui lòng nhập mã QR" };

    if (classifyCssdCode(qr) === "STERILIZATION_BATCH" || qr.startsWith(CSSD_BATCH_QR_PREFIX)) {
      const batchRes = await fetchCssdBatchPrintDataByMaLo(qr);
      if (!batchRes.success) return batchRes;
      return {
        success: true as const,
        kind: "BATCH" as const,
        batch: batchRes.data,
        process: null,
        history: [],
      };
    }

    const q = await fetchActiveQuyTrinhByScanCode(supabase, qr);
    if (!q) return { success: false as const, error: "Không tìm thấy thông tin cho mã QR này" };

    // Lịch sử từ metadata.ngoai_le (hub quy_trinh)
    const { data: qtMeta, error: qtMetaErr } = await supabase
      .from("cssd_fact_quy_trinh")
      .select("metadata, bom_kiem_dem_at")
      .eq("id", q.id)
      .maybeSingle();

    if (qtMetaErr) return { success: false as const, error: qtMetaErr.message };

    const combined: Array<{
      id: string;
      tram: string;
      hanh_dong: string;
      created_at: string;
      ghi_chu: string;
    }> = [];

    // Map ngoại lệ / sự kiện workflow từ metadata.ngoai_le
    const metadata = (qtMeta as { metadata?: Record<string, unknown> } | null)?.metadata || {};
    const ngoaiLe = Array.isArray(metadata.ngoai_le) ? metadata.ngoai_le : [];
    for (let i = 0; i < ngoaiLe.length; i++) {
      const x = ngoaiLe[i] as Record<string, unknown>;
      combined.push({
        id: `exc-${i}-${x.thoi_gian || Date.now()}`,
        tram: String(x.tu_tram || x.den_tram || ""),
        hanh_dong: String(x.su_kien || ""),
        created_at: String(x.thoi_gian || ""),
        ghi_chu: `[Ngoại lệ] ${x.ly_do || ""}${x.nguoi_thao_tac ? ` (Người làm: ${x.nguoi_thao_tac})` : ""}`.trim(),
      });
    }

    // Thêm mốc BOM checkpoint nếu có cột bom_kiem_dem_at
    const bomAt = (qtMeta as { bom_kiem_dem_at?: string | null } | null)?.bom_kiem_dem_at;
    if (bomAt && !combined.some((c) => c.hanh_dong === "KIEM_DEM_BOM")) {
      combined.push({
        id: `bom-${bomAt}`,
        tram: "DONG_GOI",
        hanh_dong: "KIEM_DEM_BOM",
        created_at: bomAt,
        ghi_chu: "Digital BOM checkpoint",
      });
    }

    // Sort by created_at descending (newest first)
    combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const process = {
      ...q,
      ma_vach_qr: q.ma_qr_quy_trinh || q.ma_qr_bo_vinh_vien || qr,
      trang_thai_hien_tai: q.ma_trang_thai_hien_tai,
      ma_cycle_qr: q.ma_cycle_qr || null,
      ma_qr_bo_vinh_vien: q.ma_qr_bo_vinh_vien || null,
      qr_kind_matched:
        String(q.ma_cycle_qr || "").toUpperCase() === qr
          ? "CYCLE"
          : String(q.ma_qr_bo_vinh_vien || "").toUpperCase() === qr
            ? "PERMANENT"
            : "SET",
    };

    return { success: true as const, kind: "SET" as const, process, history: combined };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}

/** Gán ca mổ / bệnh nhân khi truy vết (không nhập tại trạm Cấp phát workflow). */
export async function assignCssdCaMoTrace(quyTrinhId: string, maCaMoId: string) {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyCssdWorkflowView();
    const id = String(quyTrinhId || "").trim();
    const val = String(maCaMoId || "").trim();
    if (!id) return { success: false as const, error: "Thiếu mã quy trình" };
    if (!val) return { success: false as const, error: "Nhập mã ca mổ hoặc tên bệnh nhân" };

    const { data: row, error: readErr } = await supabase
      .from("cssd_fact_quy_trinh")
      .select("metadata")
      .eq("id", id)
      .maybeSingle();
    if (readErr) return { success: false as const, error: readErr.message };
    if (!row) return { success: false as const, error: "Không tìm thấy quy trình" };

    const meta = (row as { metadata?: Record<string, unknown> }).metadata || {};
    const { error } = await supabase
      .from("cssd_fact_quy_trinh")
      .update({ metadata: { ...meta, ma_ca_mo_id: val } })
      .eq("id", id);
    if (error) return { success: false as const, error: error.message };

    return { success: true as const };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}
