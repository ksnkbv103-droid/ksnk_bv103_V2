"use server";

/**
 * Neo phiếu phân tích trên Hub BA từ mốc Index (XN / XQ).
 * Không phụ thuộc maTuDong client — tránh trùng mã / không mở form.
 */

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { verifyPermission } from "@/lib/server-permission";
import { normalizeAndValidateDmKhoaPhong } from "@/lib/master-data/validation";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import { resolveMdmLoaiId, type NkbvChecklistTypeCode } from "../lib/nkbv-loai-labels";
import { bareViSinhIdFromMilestoneId } from "../lib/nkbv-vi-sinh-analysis-status";

async function assertCanWriteNkbvAnalysis() {
  try {
    await verifyPermission("GIAM_SAT_NKBV", "create");
  } catch {
    await verifyPermission("GIAM_SAT_NKBV", "edit");
  }
}

export async function ensureNkbvBaAnalysisCase(input: {
  ma_benh_an: string;
  ma_benh_nhan?: string | null;
  ho_ten_benh_nhan?: string | null;
  ngay_sinh?: string | null;
  gioi_tinh?: string | null;
  ngay_vao_vien?: string | null;
  khoa_ghi_nhan_id?: string | null;
  milestone_id: string;
  milestone_date: string;
  gate: NkbvChecklistTypeCode;
  loai_benh_pham?: string | null;
  tac_nhan?: string | null;
  title?: string | null;
  existing_case_id?: string | null;
}) {
  await assertCanWriteNkbvAnalysis();

  const supabase = createAdminSupabaseClient();
  const maBa = String(input.ma_benh_an || "").trim();
  const milestoneId = String(input.milestone_id || "").trim();
  const indexDate = String(input.milestone_date || "").slice(0, 10);
  const gate = String(input.gate || "BSI").toUpperCase();

  if (!maBa) return { success: false as const, error: "Thiếu mã bệnh án" };
  if (!milestoneId) return { success: false as const, error: "Thiếu mốc Index" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(indexDate)) {
    return { success: false as const, error: "Ngày Index không hợp lệ" };
  }

  if (input.existing_case_id) {
    const { data, error } = await supabase
      .from("v_nkbv_su_kien_full")
      .select("*")
      .eq("id", input.existing_case_id)
      .eq("is_active", true)
      .maybeSingle();
    if (!error && data) return { success: true as const, caseRow: data as Record<string, unknown> };
  }

  const slug = milestoneId.replace(/[^a-zA-Z0-9]/g, "").slice(-20) || "IDX";
  const maCa = `NK-${maBa.slice(0, 12)}-${slug}`.slice(0, 64);

  const { data: byMaCa } = await supabase
    .from("v_nkbv_su_kien_full")
    .select("*")
    .eq("ma_ca", maCa)
    .eq("is_active", true)
    .maybeSingle();
  if (byMaCa) return { success: true as const, caseRow: byMaCa as Record<string, unknown> };

  const { data: loaiRows, error: loaiErr } = await supabase
    .from("nkbv_dm_loai")
    .select("id, ma_loai")
    .eq("is_active", true);
  if (loaiErr) return { success: false as const, error: `Danh mục loại: ${loaiErr.message}` };
  const loaiId = resolveMdmLoaiId(
    (gate === "LOAI_TRU" ? "BSI" : gate) as Exclude<NkbvChecklistTypeCode, "LOAI_TRU">,
    loaiRows || [],
  );
  if (!loaiId) {
    return {
      success: false as const,
      error: `Thiếu danh mục loại NKBV cho cổng ${gate}. Kiểm tra nkbv_dm_loai.`,
    };
  }

  const statusPriority = ["DANG_GHI_NHAN", "CHO_XAC_MINH", "CHO_XAC_NHAN"] as const;
  let trangThaiId: string | undefined;
  for (const ma of statusPriority) {
    const { data: st } = await supabase
      .from("nkbv_dm_trang_thai_ca")
      .select("id")
      .eq("ma_trang_thai", ma)
      .eq("is_active", true)
      .maybeSingle();
    if (st?.id) {
      trangThaiId = st.id;
      break;
    }
  }
  if (!trangThaiId) {
    const { data: first } = await supabase
      .from("nkbv_dm_trang_thai_ca")
      .select("id")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    trangThaiId = first?.id;
  }
  if (!trangThaiId) return { success: false as const, error: "Thiếu danh mục trạng thái phiếu" };

  let khoaId: string | null = null;
  if (input.khoa_ghi_nhan_id) {
    try {
      khoaId = await normalizeAndValidateDmKhoaPhong({
        supabase,
        idRaw: input.khoa_ghi_nhan_id,
        fieldLabel: "Khoa ghi nhận",
        activeOnly: true,
      });
    } catch {
      khoaId = null;
    }
  }

  // Không gắn nguoi_ghi_id lúc neo (tránh lỗi FK nhân sự) — form vẫn mở; lưu sau mới gắn
  void getActorNhanSuId;

  const ngayVvRaw = input.ngay_vao_vien ? String(input.ngay_vao_vien).trim() : "";
  const ngayVaoVienIso = ngayVvRaw
    ? new Date(ngayVvRaw.includes("T") ? ngayVvRaw : `${ngayVvRaw.slice(0, 10)}T00:00:00.000Z`).toISOString()
    : null;

  const insertRow: Record<string, unknown> = {
    ma_ca: maCa,
    khoa_ghi_nhan_id: khoaId,
    ma_benh_nhan: String(input.ma_benh_nhan || "PID-UNKNOWN").trim() || "PID-UNKNOWN",
    ho_ten_benh_nhan: String(input.ho_ten_benh_nhan || maBa).trim() || maBa,
    ngay_sinh: input.ngay_sinh ? String(input.ngay_sinh).slice(0, 10) : null,
    gioi_tinh: input.gioi_tinh ? String(input.gioi_tinh) : null,
    ngay_vao_vien: ngayVaoVienIso,
    ngay_phat_hien: indexDate,
    vi_tri_nhiem_khuan: input.title ? String(input.title) : null,
    tac_nhan_vi_khuan: input.tac_nhan ? String(input.tac_nhan) : null,
    clinical_notes: {
      tom_tat_dien_bien: `Neo timeline ${milestoneId} · cổng ${gate}`,
      timeline_milestone_id: milestoneId,
      bien_phap_phong_ngua: null,
      ly_do_loai_tru: null,
    },
    verification_data: (() => {
      const vsId = bareViSinhIdFromMilestoneId(milestoneId);
      return vsId ? { index_vi_sinh_id: vsId } : {};
    })(),
    loai_nkbv_id: loaiId,
    trang_thai_id: trangThaiId,
    nguoi_ghi_id: null,
    ma_benh_an: maBa,
    loai_benh_pham: input.loai_benh_pham ? String(input.loai_benh_pham) : null,
    is_active: true,
  };

  let created: { id: string } | null = null;
  let createErr: { message: string } | null = null;
  {
    const res = await supabase.from("nkbv_fact_su_kien").insert(insertRow).select("id").single();
    created = res.data;
    createErr = res.error;
  }

  if (createErr) {
    if (/duplicate|unique/i.test(createErr.message)) {
      const { data: again } = await supabase
        .from("v_nkbv_su_kien_full")
        .select("*")
        .eq("ma_ca", maCa)
        .eq("is_active", true)
        .maybeSingle();
      if (again) return { success: true as const, caseRow: again as Record<string, unknown> };
    }
    // Retry không khoa nếu lỗi FK khoa
    if (/khoa|foreign key|fk/i.test(createErr.message) && insertRow.khoa_ghi_nhan_id) {
      const retry = { ...insertRow, khoa_ghi_nhan_id: null };
      const res2 = await supabase.from("nkbv_fact_su_kien").insert(retry).select("id").single();
      if (!res2.error && res2.data) {
        created = res2.data;
        createErr = null;
      } else {
        return {
          success: false as const,
          error: `Không neo phiếu: ${res2.error?.message || createErr.message}`,
        };
      }
    } else {
      return { success: false as const, error: `Không neo phiếu: ${createErr.message}` };
    }
  }

  if (!created?.id) {
    return { success: false as const, error: "Không neo được phiếu phân tích" };
  }

  const { data: full, error: fullErr } = await supabase
    .from("v_nkbv_su_kien_full")
    .select("*")
    .eq("id", created.id)
    .maybeSingle();
  if (fullErr || !full) {
    return { success: false as const, error: fullErr?.message || "Đã tạo nhưng không tải được phiếu" };
  }

  revalidatePath("/giam-sat-nkbv");
  return { success: true as const, caseRow: full as Record<string, unknown> };
}

/** Bỏ qua XN (+) có lý do — ra khỏi hàng đợi Chưa PT, không tạo HAI. */
export async function skipNkbvViSinhAnalysis(input: {
  vi_sinh_id: string;
  reason: string;
}) {
  await assertCanWriteNkbvAnalysis();
  const id = String(input.vi_sinh_id || "").trim();
  const reason = String(input.reason || "").trim();
  if (!id) return { success: false as const, error: "Thiếu mã XN vi sinh" };
  if (!reason) return { success: false as const, error: "Nhập lý do bỏ qua" };

  const supabase = createAdminSupabaseClient();
  const { data: row, error: loadErr } = await supabase
    .from("nkbv_fact_vi_sinh")
    .select("id, metadata")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  if (loadErr) return { success: false as const, error: loadErr.message };
  if (!row) return { success: false as const, error: "Không tìm thấy XN" };

  const prev =
    row.metadata && typeof row.metadata === "object"
      ? (row.metadata as Record<string, unknown>)
      : {};
  const { error } = await supabase
    .from("nkbv_fact_vi_sinh")
    .update({
      metadata: {
        ...prev,
        analysis_disposition: "BO_QUA",
        analysis_skip_reason: reason,
        analysis_skipped_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };
  revalidatePath("/giam-sat-nkbv");
  return { success: true as const };
}
