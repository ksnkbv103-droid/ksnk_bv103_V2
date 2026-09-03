"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { verifyPermission } from "@/lib/server-permission";
import { normalizeAndValidateDmKhoaPhong } from "@/lib/master-data/validation";
import { normalizeHoSoNhanVienOptionalOrThrow } from "@/lib/master-data/fk-normalize";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import { giamSatNkbvCaSchema } from "@/lib/validations";
import {
  evaluateBsiClabsi,
  evaluateVaeVap,
  evaluateUtiCauti,
  evaluateSsi,
  evaluateCh17,
} from "../lib/nkbv-rules-engine";
import { assertClinicalEvidenceForSubmit } from "../lib/nkbv-clinical-submit-gate";
import { resolveCssdQuyTrinhLinkFromMaQr } from "@/lib/cssd-nkbv-trace";
import { extractSsiReportingSlice } from "../lib/nkbv-ssi-reporting-contract";
import { stripCopiedStayFieldsFromVerification } from "../lib/nkbv-ba-ngay";
import { clean, validateLoaiTrangAndLyDo, type Payload } from "./giam-sat-nkbv-write.helpers";

export async function createGiamSatNkbvCa(payload: Payload) {
  await verifyPermission("GIAM_SAT_NKBV", "create");

  const cleaned = clean(payload);
  const parsed = giamSatNkbvCaSchema.safeParse(cleaned);
  if (!parsed.success) {
    return { success: false as const, error: "Dữ liệu không hợp lệ: " + parsed.error.issues.map((e) => e.message).join(", ") };
  }

  const supabase = createAdminSupabaseClient();
  const raw = cleaned;
  if (!String(raw.ma_ca ?? "").trim()) return { success: false as const, error: "Mã phiếu không được để trống" };
  if (!String(raw.ho_ten_benh_nhan ?? "").trim()) return { success: false as const, error: "Họ tên bệnh nhân không được để trống" };

  raw.khoa_ghi_nhan_id = await normalizeAndValidateDmKhoaPhong({
    supabase,
    idRaw: raw.khoa_ghi_nhan_id,
    fieldLabel: "Khoa ghi nhận",
    activeOnly: true,
  });
  if (!raw.loai_nkbv_id || !raw.trang_thai_id) return { success: false as const, error: "Vui lòng chọn loại NKBV và trạng thái phiếu" };

  try {
    await validateLoaiTrangAndLyDo(supabase, String(raw.loai_nkbv_id), String(raw.trang_thai_id), raw.ly_do_loai_tru);
    
    const actorNhanSuId = await getActorNhanSuId();
    const finalNguoiGhiId = raw.nguoi_ghi_id || actorNhanSuId;
    
    if (finalNguoiGhiId != null && String(finalNguoiGhiId).trim() !== "") {
      raw.nguoi_ghi_id = await normalizeHoSoNhanVienOptionalOrThrow(supabase, finalNguoiGhiId, "Người ghi");
    } else raw.nguoi_ghi_id = null;

    // 1. Ensure stay exists in nkbv_fact_benh_an first
    const cleanMaBenhAn = String(raw.ma_benh_an || `BA-TEMP-${raw.ma_benh_nhan || 'UNKNOWN'}`).trim();
    const { data: existingStay } = await supabase
      .from("nkbv_fact_benh_an")
      .select("id")
      .eq("ma_benh_an", cleanMaBenhAn)
      .eq("is_active", true)
      .maybeSingle();

    if (!existingStay) {
      const stayRow = {
        ma_benh_an: cleanMaBenhAn,
        ma_benh_nhan: String(raw.ma_benh_nhan || "PID-UNKNOWN").trim(),
        ho_ten_benh_nhan: String(raw.ho_ten_benh_nhan).trim(),
        ngay_sinh: raw.ngay_sinh ?? null,
        gioi_tinh: raw.gioi_tinh ?? null,
        ngay_vao_vien: raw.ngay_vao_vien ? new Date(String(raw.ngay_vao_vien)).toISOString() : new Date().toISOString(),
        khoa_dieu_tri_id: raw.khoa_ghi_nhan_id || null,
        is_active: true,
      };
      const { error: stayErr } = await supabase
        .from("nkbv_fact_benh_an")
        .insert(stayRow);
      if (stayErr) throw stayErr;
    }

    const insertRow = {
      ma_ca: String(raw.ma_ca).trim(),
      khoa_ghi_nhan_id: raw.khoa_ghi_nhan_id,
      ma_benh_nhan: String(raw.ma_benh_nhan || "PID-UNKNOWN").trim(),
      ho_ten_benh_nhan: String(raw.ho_ten_benh_nhan).trim(),
      ngay_sinh: raw.ngay_sinh ?? null,
      gioi_tinh: raw.gioi_tinh ?? null,
      ngay_vao_vien: raw.ngay_vao_vien ?? null,
      ngay_phat_hien: raw.ngay_phat_hien || new Date().toISOString().slice(0, 10),
      vi_tri_nhiem_khuan: raw.vi_tri_nhiem_khuan ?? null,
      tac_nhan_vi_khuan: raw.tac_nhan_vi_khuan ?? null,
      clinical_notes: {
        tom_tat_dien_bien: raw.tom_tat_dien_bien ?? (raw.clinical_notes as any)?.tom_tat_dien_bien ?? null,
        bien_phap_phong_ngua: raw.bien_phap_phong_ngua ?? (raw.clinical_notes as any)?.bien_phap_phong_ngua ?? null,
        ly_do_loai_tru: raw.ly_do_loai_tru ?? (raw.clinical_notes as any)?.ly_do_loai_tru ?? null,
      },
      vi_sinh_record_id: raw.vi_sinh_record_id ?? null,
      verification_data: stripCopiedStayFieldsFromVerification(
        (raw.verification_data && typeof raw.verification_data === "object"
          ? (raw.verification_data as Record<string, unknown>)
          : {}) as Record<string, unknown>,
      ),
      loai_nkbv_id: String(raw.loai_nkbv_id),
      trang_thai_id: String(raw.trang_thai_id),
      nguoi_ghi_id: raw.nguoi_ghi_id ?? null,
      ma_benh_an: cleanMaBenhAn,
      ma_benh_pham: raw.ma_benh_pham ?? null,
      loai_benh_pham: raw.loai_benh_pham ?? null,
      so_luong: raw.so_luong ?? null,
      is_active: true,
    };

    const { data, error } = await supabase.from("nkbv_fact_su_kien").insert(insertRow).select().single();
    if (error) return { success: false as const, error: error.message };
    revalidatePath("/giam-sat-nkbv");
    return { success: true as const, data };
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : "Lỗi lưu" };
  }
}

/** Cập nhật phiếu sự kiện nhiễm khuẩn (ghi nhận / đổi trạng thái…). */
export async function updateGiamSatNkbvCa(id: string, payload: Payload) {
  await verifyPermission("GIAM_SAT_NKBV", "edit");

  const cleaned = clean(payload);
  const parsed = giamSatNkbvCaSchema.partial().safeParse(cleaned);
  if (!parsed.success) {
    return { success: false as const, error: "Dữ liệu không hợp lệ: " + parsed.error.issues.map((e) => e.message).join(", ") };
  }

  const supabase = createAdminSupabaseClient();
  const raw = cleaned;
  if (!String(raw.ho_ten_benh_nhan ?? "").trim()) return { success: false as const, error: "Họ tên bệnh nhân không được để trống" };

  raw.khoa_ghi_nhan_id = await normalizeAndValidateDmKhoaPhong({
    supabase,
    idRaw: raw.khoa_ghi_nhan_id,
    fieldLabel: "Khoa ghi nhận",
    activeOnly: true,
  });
  if (!raw.loai_nkbv_id || !raw.trang_thai_id) return { success: false as const, error: "Vui lòng chọn loại NKBV và trạng thái phiếu" };

  try {
    await validateLoaiTrangAndLyDo(supabase, String(raw.loai_nkbv_id), String(raw.trang_thai_id), raw.ly_do_loai_tru);
    
    const actorNhanSuId = await getActorNhanSuId();
    const finalNguoiGhiId = raw.nguoi_ghi_id || actorNhanSuId;
    
    if (finalNguoiGhiId != null && String(finalNguoiGhiId).trim() !== "") {
      raw.nguoi_ghi_id = await normalizeHoSoNhanVienOptionalOrThrow(supabase, finalNguoiGhiId, "Người ghi");
    } else raw.nguoi_ghi_id = null;

    const patch: any = {
      khoa_ghi_nhan_id: raw.khoa_ghi_nhan_id,
      ma_benh_nhan: raw.ma_benh_nhan,
      ho_ten_benh_nhan: String(raw.ho_ten_benh_nhan).trim(),
      ngay_sinh: raw.ngay_sinh ?? null,
      gioi_tinh: raw.gioi_tinh ?? null,
      ngay_vao_vien: raw.ngay_vao_vien ?? null,
      ngay_phat_hien: raw.ngay_phat_hien,
      vi_tri_nhiem_khuan: raw.vi_tri_nhiem_khuan ?? null,
      tac_nhan_vi_khuan: raw.tac_nhan_vi_khuan ?? null,
      clinical_notes: {
        tom_tat_dien_bien: raw.tom_tat_dien_bien ?? (raw.clinical_notes as any)?.tom_tat_dien_bien ?? null,
        bien_phap_phong_ngua: raw.bien_phap_phong_ngua ?? (raw.clinical_notes as any)?.bien_phap_phong_ngua ?? null,
        ly_do_loai_tru: raw.ly_do_loai_tru ?? (raw.clinical_notes as any)?.ly_do_loai_tru ?? null,
      },
      loai_nkbv_id: String(raw.loai_nkbv_id),
      trang_thai_id: String(raw.trang_thai_id),
      nguoi_ghi_id: raw.nguoi_ghi_id ?? null,
      updated_at: new Date().toISOString(),
      ma_benh_an: raw.ma_benh_an ?? null,
      ma_benh_pham: raw.ma_benh_pham ?? null,
      loai_benh_pham: raw.loai_benh_pham ?? null,
      so_luong: raw.so_luong ?? null,
    };

    if (raw.vi_sinh_record_id !== undefined) patch.vi_sinh_record_id = raw.vi_sinh_record_id;
    if (raw.verification_data !== undefined) patch.verification_data = raw.verification_data;

    const { data, error } = await supabase.from("nkbv_fact_su_kien").update(patch).eq("id", id).select().single();
    if (error) return { success: false as const, error: error.message };
    revalidatePath("/giam-sat-nkbv");
    return { success: true as const, data };
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : "Lỗi lưu" };
  }
}

/** Ẩn phiếu sự kiện khỏi danh sách (soft delete). */
export async function softDeleteGiamSatNkbvCa(id: string) {
  await verifyPermission("GIAM_SAT_NKBV", "delete");
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("nkbv_fact_su_kien")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };
  revalidatePath("/giam-sat-nkbv");
  return { success: true as const };
}

/** Lâm sàng điền checklist triệu chứng và chạy Rules Engine CDC tự động đề xuất chẩn đoán. */
export async function submitClinicalVerification(id: string, viTriNhiemKhuan: string, verificationInput: any) {
  await verifyPermission("GIAM_SAT_NKBV", "edit");
  const supabase = createAdminSupabaseClient();

  try {
    if (viTriNhiemKhuan === "LOAI_TRU") {
      const excludeStatus = await supabase
        .from("nkbv_dm_trang_thai_ca")
        .select("id")
        .eq("ma_trang_thai", "LOAI_TRU")
        .eq("is_active", true)
        .maybeSingle()
        .then((r) => r.data);

      const { data: prevCa } = await supabase
        .from("nkbv_fact_su_kien")
        .select("clinical_notes")
        .eq("id", id)
        .maybeSingle();
      const prevNotes =
        prevCa?.clinical_notes && typeof prevCa.clinical_notes === "object"
          ? (prevCa.clinical_notes as Record<string, unknown>)
          : {};
      const notes = verificationInput.clinical_notes || {};
      const lyDo = String(notes.ly_do_loai_tru || verificationInput.ly_do_loai_tru || "").trim();
      const ghiChu = String(verificationInput.ghi_chu_tuy_bien || notes.ghi_chu_tuy_bien || "").trim();
      const updatedNotes = {
        ...prevNotes,
        ...notes,
        ly_do_loai_tru: lyDo || ghiChu || "Bác sĩ phán quyết loại trừ ca bệnh.",
        ...(ghiChu ? { ghi_chu_tuy_bien: ghiChu } : {}),
      };

      const { data, error: updateErr } = await supabase
        .from("nkbv_fact_su_kien")
        .update({
          trang_thai_id: excludeStatus!.id,
          clinical_notes: updatedNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      
      if (updateErr) throw updateErr;
      revalidatePath("/giam-sat-nkbv");
      return { success: true as const, data, evaluation: { is_positive: false, classification: "LOAI_TRU", reason: "Phán quyết loại trừ ca bệnh." } };
    }

    const { data: caRow } = await supabase
      .from("nkbv_fact_su_kien")
      .select("ngay_phat_hien, ngay_vao_vien, clinical_notes")
      .eq("id", id)
      .maybeSingle();

    const gateInput = {
      ...verificationInput,
      ngay_phat_hien:
        verificationInput?.ngay_phat_hien ||
        verificationInput?.calculated_doe ||
        caRow?.ngay_phat_hien ||
        "",
      ngay_lay_mau: verificationInput?.ngay_lay_mau || caRow?.ngay_phat_hien || "",
      symptom_dates: verificationInput?.symptom_dates || {},
    };

    const gate = assertClinicalEvidenceForSubmit(viTriNhiemKhuan, gateInput);
    if (!gate.ok) {
      return { success: false as const, error: gate.error };
    }

    let result;
    if (viTriNhiemKhuan === "BSI") {
      result = evaluateBsiClabsi(verificationInput);
    } else if (viTriNhiemKhuan === "VAE") {
      result = evaluateVaeVap(verificationInput, "VAE");
    } else if (viTriNhiemKhuan === "VAP" || viTriNhiemKhuan === "HAP" || viTriNhiemKhuan === "PNEU") {
      result = evaluateVaeVap(verificationInput, "PNEU");
    } else if (viTriNhiemKhuan === "UTI") {
      result = evaluateUtiCauti(verificationInput);
    } else if (viTriNhiemKhuan === "SSI") {
      result = evaluateSsi(verificationInput);
    } else if (viTriNhiemKhuan === "CH17") {
      result = evaluateCh17(verificationInput);
    } else {
      throw new Error(`Vị trí nhiễm khuẩn không hợp lệ: ${viTriNhiemKhuan}`);
    }

    // Map code to Vietnamese label and category code — VAE / VAP / HAP tách riêng
    let mappedViTri = "";
    let loaiCode = "";
    if (viTriNhiemKhuan === "BSI") {
      mappedViTri = "Máu";
      loaiCode = "BSI";
    } else if (viTriNhiemKhuan === "VAE") {
      mappedViTri = "Đường hô hấp (VAE)";
      loaiCode = "VAE";
    } else if (viTriNhiemKhuan === "VAP") {
      mappedViTri = "Đường hô hấp (VAP)";
      loaiCode = "VAP";
    } else if (viTriNhiemKhuan === "HAP" || viTriNhiemKhuan === "PNEU") {
      mappedViTri = "Đường hô hấp (HAP)";
      loaiCode = "HAP";
    } else if (viTriNhiemKhuan === "UTI") {
      mappedViTri = "Đường tiết niệu";
      loaiCode = "UTI";
    } else if (viTriNhiemKhuan === "SSI") {
      mappedViTri = "Vết mổ";
      loaiCode = "SSI";
    } else if (viTriNhiemKhuan === "CH17") {
      const cls = String(result.classification || "");
      const site =
        cls.startsWith("CH17:") || cls.startsWith("SSI:")
          ? cls.split(":")[1]
          : String(verificationInput?.ch17_type_code || "CH17").toUpperCase();
      mappedViTri = `Chương 17 (${site})`;
      loaiCode = site || "CH17";
    }

    // Query loai_nkbv_id based on loaiCode (VAE / VAP / HAP tách; HAP fallback PNEU)
    let loaiNkbvId = undefined;
    if (loaiCode) {
      const orParts = [`ma_loai.ilike.%${loaiCode}%`, `ma_loai.ilike.%${viTriNhiemKhuan}%`];
      if (loaiCode === "HAP") orParts.push("ma_loai.ilike.%PNEU%");
      if (loaiCode === "VAP") orParts.push("ma_loai.ilike.%PEDVAP%");
      const { data: matchedLoai } = await supabase
        .from("nkbv_dm_loai")
        .select("id, ma_loai")
        .or(orParts.join(","))
        .eq("is_active", true)
        .limit(5);

      const exact =
        (matchedLoai || []).find((r) => String(r.ma_loai || "").toUpperCase() === loaiCode) ||
        (matchedLoai || [])[0];
      if (exact) {
        loaiNkbvId = exact.id;
      }
    }

    let lookupStatus = await supabase
      .from("nkbv_dm_trang_thai_ca")
      .select("id")
      .eq("ma_trang_thai", "CHO_DUYET")
      .eq("is_active", true)
      .maybeSingle()
      .then((r) => r.data);

    if (!lookupStatus) {
      lookupStatus = await supabase
        .from("nkbv_dm_trang_thai_ca")
        .select("id")
        .eq("ma_trang_thai", "CHO_XAC_NHAN")
        .eq("is_active", true)
        .maybeSingle()
        .then((r) => r.data);
    }

    const verification_data = stripCopiedStayFieldsFromVerification({
      ...verificationInput,
      evaluation_result: result,
      classification: result.classification,
      is_positive: result.is_positive,
      is_secondary_bsi: result.is_secondary_bsi || false,
      reason: result.reason,
      ghi_chu_tuy_bien: verificationInput?.ghi_chu_tuy_bien || undefined,
      ...(viTriNhiemKhuan === "SSI"
        ? { ssi_reporting: extractSsiReportingSlice(verificationInput) }
        : {}),
    });

    const prevNotes =
      caRow?.clinical_notes && typeof caRow.clinical_notes === "object"
        ? (caRow.clinical_notes as Record<string, unknown>)
        : {};
    const ghiChu = String(verificationInput?.ghi_chu_tuy_bien || "").trim();

    const patch: Record<string, unknown> = {
      verification_data,
      trang_thai_id: lookupStatus!.id,
      vi_tri_nhiem_khuan: mappedViTri || undefined,
      ...(loaiNkbvId && { loai_nkbv_id: loaiNkbvId }),
      clinical_notes: {
        ...prevNotes,
        ...(ghiChu ? { ghi_chu_tuy_bien: ghiChu } : {}),
      },
      updated_at: new Date().toISOString(),
    };

    if (viTriNhiemKhuan === "SSI") {
      const maQr = String(verificationInput?.ma_qr_cssd_lien_quan || "").trim();
      if (maQr) {
        const link = await resolveCssdQuyTrinhLinkFromMaQr(supabase, maQr);
        if (link) {
          patch.quy_trinh_id = link.quy_trinh_id;
          patch.lo_tiet_khuan_id = link.lo_tiet_khuan_id;
          patch.ma_cycle_qr_lien_quan = link.ma_qr;
        } else {
          patch.ma_cycle_qr_lien_quan = maQr.toUpperCase();
        }
      }
    }

    const { data, error: updateErr } = await supabase
      .from("nkbv_fact_su_kien")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    revalidatePath("/giam-sat-nkbv");
    revalidatePath("/cssd-quy-trinh");
    return { success: true as const, data, evaluation: result };
  } catch (e: any) {
    return { success: false as const, error: e.message || "Lỗi lưu xác minh triệu chứng" };
  }
}

/** KSNK thẩm định bình duyệt phán quyết cuối cùng (Phê duyệt XAC_NHAN hoặc từ chối LOAI_TRU kèm lý do). */
export async function approveOrExcludeNkbvCase(id: string, decision: "APPROVE" | "EXCLUDE", lyDoLoaiTru?: string) {
  await verifyPermission("GIAM_SAT_NKBV", "edit");
  const supabase = createAdminSupabaseClient();

  try {
    const statusCode = decision === "APPROVE" ? "XAC_NHAN" : "LOAI_TRU";
    
    const { data: lookupStatus, error: lErr } = await supabase
      .from("nkbv_dm_trang_thai_ca")
      .select("id")
      .eq("ma_trang_thai", statusCode)
      .eq("is_active", true)
      .maybeSingle();
    if (lErr) throw lErr;
    if (!lookupStatus) throw new Error(`Không tìm thấy trạng thái ${statusCode}.`);

    const { data: ca, error: fetchErr } = await supabase
      .from("nkbv_fact_su_kien")
      .select("clinical_notes")
      .eq("id", id)
      .single();
    if (fetchErr) throw fetchErr;

    const existingNotes = ca?.clinical_notes && typeof ca.clinical_notes === "object" ? ca.clinical_notes : {};
    const updatedNotes = {
      ...existingNotes,
      ly_do_loai_tru: decision === "EXCLUDE" ? (lyDoLoaiTru || "Từ chối bởi KSNK") : null,
    };

    const { data, error: updateErr } = await supabase
      .from("nkbv_fact_su_kien")
      .update({
        trang_thai_id: lookupStatus.id,
        clinical_notes: updatedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    revalidatePath("/giam-sat-nkbv");
    return { success: true as const, data };
  } catch (e: any) {
    return { success: false as const, error: e.message || "Lỗi cập nhật quyết định thẩm định" };
  }
}

/**
 * Sửa hồ sơ đợt nằm viện (Admission) trên nkbv_fact_benh_an — không ghi phiếu sự kiện.
 */
export async function updateNkbvBenhAnStay(input: {
  ma_benh_an: string;
  ma_benh_nhan?: string | null;
  ho_ten_benh_nhan?: string | null;
  ngay_sinh?: string | null;
  gioi_tinh?: string | null;
  ngay_vao_vien?: string | null;
  ngay_ra_vien?: string | null;
  khoa_dieu_tri_id?: string | null;
  ket_cuc_dieu_tri?: string | null;
  ly_do_tu_vong?: string | null;
  tu_vong_lien_quan_nkbv?: boolean | null;
}) {
  await verifyPermission("GIAM_SAT_NKBV", "edit");
  const ma = String(input.ma_benh_an || "").trim();
  if (!ma) return { success: false as const, error: "Thiếu mã bệnh án" };

  const supabase = createAdminSupabaseClient();
  try {
    const { data: prev, error: prevErr } = await supabase
      .from("nkbv_fact_benh_an")
      .select("id, ngay_vao_vien")
      .eq("ma_benh_an", ma)
      .eq("is_active", true)
      .maybeSingle();
    if (prevErr) throw prevErr;
    if (!prev) return { success: false as const, error: "Không tìm thấy hồ sơ bệnh án" };

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (input.ma_benh_nhan !== undefined) {
      const bn = String(input.ma_benh_nhan || "").trim();
      if (!bn) return { success: false as const, error: "Mã bệnh nhân không được để trống" };
      patch.ma_benh_nhan = bn;
    }
    if (input.ho_ten_benh_nhan !== undefined) {
      const ten = String(input.ho_ten_benh_nhan || "").trim();
      if (!ten) return { success: false as const, error: "Họ tên không được để trống" };
      patch.ho_ten_benh_nhan = ten;
    }
    if (input.ngay_sinh !== undefined) {
      patch.ngay_sinh = input.ngay_sinh ? String(input.ngay_sinh).slice(0, 10) : null;
    }
    if (input.gioi_tinh !== undefined) {
      patch.gioi_tinh = input.gioi_tinh ? String(input.gioi_tinh).trim() : null;
    }
    if (input.ngay_vao_vien !== undefined) {
      const vv = input.ngay_vao_vien ? String(input.ngay_vao_vien).slice(0, 10) : "";
      if (vv && !/^\d{4}-\d{2}-\d{2}$/.test(vv)) {
        return { success: false as const, error: "Ngày vào viện không hợp lệ" };
      }
      patch.ngay_vao_vien = vv ? new Date(`${vv}T12:00:00`).toISOString() : null;
    }
    if (input.ngay_ra_vien !== undefined) {
      const rv = input.ngay_ra_vien ? String(input.ngay_ra_vien).slice(0, 10) : "";
      if (rv && !/^\d{4}-\d{2}-\d{2}$/.test(rv)) {
        return { success: false as const, error: "Ngày ra viện không hợp lệ" };
      }
      const vvRaw =
        input.ngay_vao_vien !== undefined
          ? String(input.ngay_vao_vien || "").slice(0, 10)
          : prev.ngay_vao_vien
            ? String(prev.ngay_vao_vien).slice(0, 10)
            : "";
      if (rv && vvRaw && rv < vvRaw) {
        return { success: false as const, error: "Ngày ra viện không được trước ngày vào viện" };
      }
      patch.ngay_ra_vien = rv ? new Date(`${rv}T12:00:00`).toISOString() : null;
    }
    if (input.khoa_dieu_tri_id !== undefined) {
      patch.khoa_dieu_tri_id = input.khoa_dieu_tri_id
        ? await normalizeAndValidateDmKhoaPhong({
            supabase,
            idRaw: input.khoa_dieu_tri_id,
            fieldLabel: "Khoa điều trị",
            activeOnly: true,
          })
        : null;
    }
    if (input.ket_cuc_dieu_tri !== undefined) {
      const kc = input.ket_cuc_dieu_tri ? String(input.ket_cuc_dieu_tri).trim() : "";
      const allowed = new Set(["", "KHOI_DO", "NANG_XIN_VE", "TU_VONG", "CHUYEN_VIEN"]);
      if (!allowed.has(kc)) {
        return { success: false as const, error: "Kết cục điều trị không hợp lệ" };
      }
      patch.ket_cuc_dieu_tri = kc || null;
    }
    if (input.ly_do_tu_vong !== undefined) {
      patch.ly_do_tu_vong = input.ly_do_tu_vong ? String(input.ly_do_tu_vong).trim() : null;
    }
    if (input.tu_vong_lien_quan_nkbv !== undefined) {
      patch.tu_vong_lien_quan_nkbv = Boolean(input.tu_vong_lien_quan_nkbv);
    }

    const ketCuc = String(patch.ket_cuc_dieu_tri ?? "");
    if (ketCuc && ketCuc !== "TU_VONG") {
      patch.ly_do_tu_vong = null;
      patch.tu_vong_lien_quan_nkbv = false;
    }

    const { data, error } = await supabase
      .from("nkbv_fact_benh_an")
      .update(patch)
      .eq("id", prev.id)
      .select()
      .single();
    if (error) throw error;

    revalidatePath("/giam-sat-nkbv");
    return { success: true as const, data };
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : "Lỗi cập nhật hồ sơ bệnh án" };
  }
}

/**
 * Đồng bộ ngày vào viện từ phiếu xác định ca → bệnh án + sự kiện (căn cứ HAI/POA).
 */
export async function syncNkbvAdmissionDate(input: {
  ma_benh_an: string;
  su_kien_id?: string | null;
  ngay_vao_vien: string;
}) {
  await verifyPermission("GIAM_SAT_NKBV", "edit");
  const ma = String(input.ma_benh_an || "").trim();
  const ngay = String(input.ngay_vao_vien || "").slice(0, 10);
  if (!ma) return { success: false as const, error: "Thiếu mã bệnh án" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay)) {
    return { success: false as const, error: "Ngày vào viện không hợp lệ" };
  }

  const supabase = createAdminSupabaseClient();
  try {
    const iso = new Date(`${ngay}T12:00:00`).toISOString();
    const { error: stayErr } = await supabase
      .from("nkbv_fact_benh_an")
      .update({ ngay_vao_vien: iso, updated_at: new Date().toISOString() })
      .eq("ma_benh_an", ma)
      .eq("is_active", true);
    if (stayErr) throw stayErr;

    if (input.su_kien_id) {
      const { error: evErr } = await supabase
        .from("nkbv_fact_su_kien")
        .update({ ngay_vao_vien: ngay, updated_at: new Date().toISOString() })
        .eq("id", input.su_kien_id);
      if (evErr) throw evErr;
    }

    revalidatePath("/giam-sat-nkbv");
    return { success: true as const, ngay_vao_vien: ngay };
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : "Lỗi đồng bộ ngày vào viện" };
  }
}
