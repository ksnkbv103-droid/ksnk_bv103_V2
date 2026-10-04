"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { fetchAllRangeRows } from "@/lib/fetch-all-range";
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
import {
  clean,
  releaseViSinhStampsAfterHide,
  validateLoaiTrangAndLyDo,
  type Payload,
} from "./giam-sat-nkbv-write.helpers";
import {
  resolveServerRitPriors,
  verifiedSiblingFromCaseRow,
} from "../lib/nkbv-rit-hard-stop";
import { resolveNkbvMajorType } from "../lib/nkbv-major-type";
import {
  loaiCodeFromClassification,
  nkbvNonHaiCloseReason,
} from "../lib/nkbv-classification-taxonomy";
import { hydratePriorOpenVaeDoe } from "../lib/nkbv-vae-event-period";
import {
  isNkbvTerminalCaseStatus,
  NKBV_CLINICAL_SUBMIT_LOCKED_VI,
} from "../lib/nkbv-case-status";

export async function createGiamSatNkbvCa(_payload: Payload) {
  await verifyPermission("GIAM_SAT_NKBV", "create");
  return {
    success: false as const,
    error:
      "Phiếu mới chỉ tạo từ Hub bệnh án sau khi phân tích (nút Tạo phiếu). Không tạo phiếu trống từ danh sách.",
  };
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
  const { data: row, error: loadErr } = await supabase
    .from("nkbv_fact_su_kien")
    .select("id, verification_data")
    .eq("id", id)
    .maybeSingle();
  if (loadErr) return { success: false as const, error: loadErr.message };
  if (!row) return { success: false as const, error: "Không tìm thấy phiếu" };

  const releaseErr = await releaseViSinhStampsAfterHide(supabase, id, row.verification_data);
  if (releaseErr) return { success: false as const, error: releaseErr };

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
    const { data: statusProbe, error: statusProbeErr } = await supabase
      .from("v_nkbv_su_kien_full")
      .select("trang_thai_ma")
      .eq("id", id)
      .maybeSingle();
    if (statusProbeErr) throw statusProbeErr;
    if (!statusProbe) return { success: false as const, error: "Không tìm thấy phiếu" };
    if (isNkbvTerminalCaseStatus(statusProbe.trang_thai_ma as string | null)) {
      return { success: false as const, error: NKBV_CLINICAL_SUBMIT_LOCKED_VI };
    }

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

      if (!excludeStatus?.id) {
        return { success: false as const, error: "Thiếu danh mục trạng thái LOAI_TRU — liên hệ quản trị." };
      }

      const { data, error: updateErr } = await supabase
        .from("nkbv_fact_su_kien")
        .update({
          trang_thai_id: excludeStatus.id,
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
      .select("ngay_phat_hien, ngay_vao_vien, clinical_notes, ma_benh_an")
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

    // Ch.2 RIT: server luôn tự nạp sibling cùng ma_benh_an — bỏ qua rit_prior_events client
    const ritBypass =
      viTriNhiemKhuan === "SSI" || viTriNhiemKhuan === "VAE";
    let ritPriorEvents: ReturnType<typeof resolveServerRitPriors> = [];
    if (!ritBypass && caRow?.ma_benh_an) {
      const siblings = await fetchAllRangeRows<Record<string, unknown>>((from, to) =>
        supabase
          .from("v_nkbv_su_kien_full")
          .select(
            "id, loai_ma, loai_ten, vi_tri_nhiem_khuan, ngay_phat_hien, trang_thai_ma, verification_data",
          )
          .eq("ma_benh_an", caRow.ma_benh_an)
          .eq("is_active", true)
          .neq("id", id)
          .order("ngay_phat_hien", { ascending: false })
          .order("id", { ascending: true })
          .range(from, to),
      );
      ritPriorEvents = resolveServerRitPriors({
        siblings: siblings.map((s) =>
          verifiedSiblingFromCaseRow({
            ...s,
            ngay_vao_vien: caRow.ngay_vao_vien,
          }),
        ),
        admissionDate: caRow.ngay_vao_vien
          ? String(caRow.ngay_vao_vien).slice(0, 10)
          : null,
      });
    }

    // POA/HAI: hydrate ngày VV từ phiếu/BA — bỏ hai_status client
    let ngayVaoVienServer = caRow?.ngay_vao_vien
      ? String(caRow.ngay_vao_vien).slice(0, 10)
      : "";
    if (!ngayVaoVienServer && caRow?.ma_benh_an) {
      const { data: baStay } = await supabase
        .from("nkbv_fact_benh_an")
        .select("ngay_vao_vien")
        .eq("ma_benh_an", caRow.ma_benh_an)
        .eq("is_active", true)
        .maybeSingle();
      if (baStay?.ngay_vao_vien) {
        ngayVaoVienServer = String(baStay.ngay_vao_vien).slice(0, 10);
      }
    }

    const evalInput: Record<string, unknown> = {
      ...verificationInput,
      // Không tin danh sách client — luôn ghi đè bằng prior server
      rit_prior_events: ritPriorEvents,
      // Không tin hai_status client — server tự tính từ ngày VV + DOE
      hai_status: undefined,
      ngay_vao_vien: ngayVaoVienServer || undefined,
      admission_date: ngayVaoVienServer || undefined,
      rit_exclude_event_ids: [
        id,
        ...((verificationInput?.rit_exclude_event_ids as string[] | undefined) || []),
      ],
    };

    // L11 Soft Soft Soft-safe: hydrate prior_open_vae_doe từ prior open VAE cùng BA
    // (không reuse RIT Ch.2; Event Period gate trong evaluateVaeVap).
    if (viTriNhiemKhuan === "VAE" && caRow?.ma_benh_an) {
      const vaeSiblings = await fetchAllRangeRows<Record<string, unknown>>((from, to) =>
        supabase
          .from("v_nkbv_su_kien_full")
          .select(
            "id, loai_ma, loai_ten, vi_tri_nhiem_khuan, ngay_phat_hien, trang_thai_ma, verification_data",
          )
          .eq("ma_benh_an", caRow.ma_benh_an)
          .eq("is_active", true)
          .neq("id", id)
          .order("ngay_phat_hien", { ascending: false })
          .order("id", { ascending: true })
          .range(from, to),
      );
      const priorCases = vaeSiblings
        .filter((s) => String(s.trang_thai_ma || "").toUpperCase() !== "LOAI_TRU")
        .map((s) => {
          const vd =
            s.verification_data && typeof s.verification_data === "object"
              ? (s.verification_data as Record<string, unknown>)
              : {};
          const metrics =
            vd.cdc_metrics && typeof vd.cdc_metrics === "object"
              ? (vd.cdc_metrics as Record<string, unknown>)
              : vd;
          const doe =
            (metrics.doe as string | undefined) ||
            (metrics.DOE as string | undefined) ||
            (vd.calculated_doe as string | undefined) ||
            (s.ngay_phat_hien as string | null);
          return {
            id: String(s.id),
            doe: doe ? String(doe).slice(0, 10) : null,
            ngay_phat_hien: s.ngay_phat_hien ? String(s.ngay_phat_hien).slice(0, 10) : null,
            calculated_doe: vd.calculated_doe ? String(vd.calculated_doe).slice(0, 10) : null,
            loai_ma: s.loai_ma ? String(s.loai_ma) : null,
            vi_tri_nhiem_khuan: s.vi_tri_nhiem_khuan
              ? String(s.vi_tri_nhiem_khuan)
              : null,
            classification:
              typeof vd.classification === "string"
                ? vd.classification
                : typeof vd.engine_classification === "string"
                  ? vd.engine_classification
                  : null,
          };
        });
      const candidateDoe =
        String(
          (verificationInput as { calculated_doe?: string } | null | undefined)
            ?.calculated_doe ||
            (verificationInput as { ngay_phat_hien?: string } | null | undefined)
              ?.ngay_phat_hien ||
            "",
        ).slice(0, 10) || null;
      const existing = (verificationInput as { prior_open_vae_doe?: string | null } | null)
        ?.prior_open_vae_doe;
      const hydrated = hydratePriorOpenVaeDoe({
        candidateDoe,
        priorCases,
        excludeEventIds: [id],
        existingPriorOpenVaeDoe: existing,
      });
      if (hydrated) {
        evalInput.prior_open_vae_doe = hydrated;
      }
    }

    let result;
    if (viTriNhiemKhuan === "BSI") {
      result = evaluateBsiClabsi(evalInput as never);
    } else if (viTriNhiemKhuan === "VAE") {
      result = evaluateVaeVap(evalInput as never, "VAE");
    } else if (viTriNhiemKhuan === "VAP" || viTriNhiemKhuan === "HAP" || viTriNhiemKhuan === "PNEU") {
      result = evaluateVaeVap(evalInput as never, "PNEU");
    } else if (viTriNhiemKhuan === "UTI") {
      result = evaluateUtiCauti(evalInput as never);
    } else if (viTriNhiemKhuan === "SSI") {
      result = evaluateSsi(evalInput as never);
    } else if (viTriNhiemKhuan === "CH17") {
      result = evaluateCh17(evalInput as never);
    } else {
      throw new Error(`Vị trí nhiễm khuẩn không hợp lệ: ${viTriNhiemKhuan}`);
    }

    // Map loại theo classification engine (cổng PNEU → VAP/HAP theo kết luận)
    let mappedViTri = "";
    let loaiCode = loaiCodeFromClassification(result.classification, viTriNhiemKhuan);
    if (loaiCode === "BSI" || viTriNhiemKhuan === "BSI") {
      mappedViTri = "Máu";
      loaiCode = "BSI";
    } else if (loaiCode === "VAE" || viTriNhiemKhuan === "VAE") {
      mappedViTri = "Đường hô hấp (VAE)";
      loaiCode = "VAE";
    } else if (loaiCode === "VAP") {
      mappedViTri = "Đường hô hấp (VAP)";
    } else if (
      loaiCode === "HAP" ||
      viTriNhiemKhuan === "HAP" ||
      viTriNhiemKhuan === "PNEU" ||
      viTriNhiemKhuan === "VAP"
    ) {
      mappedViTri =
        loaiCode === "VAP" ? "Đường hô hấp (VAP)" : "Đường hô hấp (HAP)";
      if (loaiCode !== "VAP") loaiCode = "HAP";
    } else if (loaiCode === "UTI" || viTriNhiemKhuan === "UTI") {
      mappedViTri = "Đường tiết niệu";
      loaiCode = "UTI";
    } else if (loaiCode === "SSI" || viTriNhiemKhuan === "SSI") {
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

    // Tra loai_nkbv_id — khớp chính xác mã trước; HAP fallback PNEU
    let loaiNkbvId = undefined;
    if (loaiCode) {
      const { data: matchedLoai } = await supabase
        .from("nkbv_dm_loai")
        .select("id, ma_loai")
        .eq("is_active", true)
        .in(
          "ma_loai",
          loaiCode === "HAP"
            ? [loaiCode, "PNEU", "HAP"]
            : [loaiCode],
        )
        .limit(10);

      const exact =
        (matchedLoai || []).find(
          (r) => String(r.ma_loai || "").toUpperCase() === loaiCode,
        ) ||
        (loaiCode === "HAP"
          ? (matchedLoai || []).find(
              (r) => String(r.ma_loai || "").toUpperCase() === "PNEU",
            )
          : undefined) ||
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
    if (!lookupStatus?.id) {
      return {
        success: false as const,
        error: "Thiếu danh mục trạng thái CHO_DUYET/CHO_XAC_NHAN — liên hệ quản trị.",
      };
    }

    const poaMajor =
      result.classification === "POA"
        ? resolveNkbvMajorType({
            loai_ma: viTriNhiemKhuan,
            vi_tri_nhiem_khuan: viTriNhiemKhuan,
          })
        : null;

    const verification_data = stripCopiedStayFieldsFromVerification({
      ...verificationInput,
      // Không persist prior client — server tự nạp mỗi lần evaluate
      rit_prior_events: undefined,
      evaluation_result: result,
      classification: result.classification,
      is_positive: result.is_positive,
      is_secondary_bsi: result.is_secondary_bsi || false,
      reason: result.reason,
      ghi_chu_tuy_bien: verificationInput?.ghi_chu_tuy_bien || undefined,
      ...(poaMajor && poaMajor !== "OTHER" && poaMajor !== "SSI" && poaMajor !== "VAE"
        ? { poa_major_type: poaMajor }
        : {}),
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
      trang_thai_id: lookupStatus.id,
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

/** KSNK thẩm định: APPROVE → XAC_NHAN chỉ khi is_positive; không-NKBV → LOAI_TRU + lý do tự sinh. */
export async function approveOrExcludeNkbvCase(id: string, decision: "APPROVE" | "EXCLUDE", lyDoLoaiTru?: string) {
  await verifyPermission("GIAM_SAT_NKBV", "approve");
  const supabase = createAdminSupabaseClient();

  try {
    const { data: ca, error: fetchErr } = await supabase
      .from("nkbv_fact_su_kien")
      .select("clinical_notes, verification_data")
      .eq("id", id)
      .single();
    if (fetchErr) throw fetchErr;

    const vd =
      ca?.verification_data && typeof ca.verification_data === "object"
        ? (ca.verification_data as Record<string, unknown>)
        : {};
    const isPositive = vd.is_positive === true;
    const classification =
      typeof vd.classification === "string" ? vd.classification : "";

    if (decision === "APPROVE" && !isPositive) {
      return {
        success: false as const,
        error: "Kết luận không phải NKBV — chỉ phê duyệt khi engine dương tính (HAI đủ tiêu chí).",
      };
    }

    const statusCode = decision === "APPROVE" ? "XAC_NHAN" : "LOAI_TRU";
    const { data: lookupStatus, error: lErr } = await supabase
      .from("nkbv_dm_trang_thai_ca")
      .select("id")
      .eq("ma_trang_thai", statusCode)
      .eq("is_active", true)
      .maybeSingle();
    if (lErr) throw lErr;
    if (!lookupStatus) throw new Error(`Không tìm thấy trạng thái ${statusCode}.`);

    const existingNotes =
      ca?.clinical_notes && typeof ca.clinical_notes === "object" ? ca.clinical_notes : {};
    const autoReason = nkbvNonHaiCloseReason(classification);
    const updatedNotes = {
      ...existingNotes,
      ly_do_loai_tru:
        decision === "EXCLUDE"
          ? (lyDoLoaiTru?.trim() || autoReason)
          : null,
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

/** Tạo đợt nằm viện — không tạo phiếu HAI. */
export async function createNkbvBenhAnStay(input: {
  ma_benh_an: string;
  ma_benh_nhan: string;
  ho_ten_benh_nhan: string;
  ngay_sinh?: string | null;
  gioi_tinh?: string | null;
  ngay_vao_vien: string;
  khoa_dieu_tri_id?: string | null;
}) {
  await verifyPermission("GIAM_SAT_NKBV", "create");
  const ma = String(input.ma_benh_an || "").trim();
  const bn = String(input.ma_benh_nhan || "").trim();
  const ten = String(input.ho_ten_benh_nhan || "").trim();
  const vv = String(input.ngay_vao_vien || "").slice(0, 10);
  if (!ma) return { success: false as const, error: "Thiếu mã bệnh án" };
  if (!bn) return { success: false as const, error: "Thiếu mã bệnh nhân" };
  if (!ten) return { success: false as const, error: "Thiếu họ tên" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(vv)) {
    return { success: false as const, error: "Ngày vào viện không hợp lệ" };
  }

  const supabase = createAdminSupabaseClient();
  try {
    const { data: existing } = await supabase
      .from("nkbv_fact_benh_an")
      .select("id")
      .eq("ma_benh_an", ma)
      .eq("is_active", true)
      .maybeSingle();
    if (existing) {
      return { success: false as const, error: "Mã bệnh án đã có — không tạo trùng, không đè hồ sơ." };
    }

    let khoaId: string | null = null;
    if (input.khoa_dieu_tri_id) {
      khoaId = await normalizeAndValidateDmKhoaPhong({
        supabase,
        idRaw: input.khoa_dieu_tri_id,
        fieldLabel: "Khoa điều trị",
        activeOnly: true,
      });
    }

    const { data, error } = await supabase
      .from("nkbv_fact_benh_an")
      .insert({
        ma_benh_an: ma,
        ma_benh_nhan: bn,
        ho_ten_benh_nhan: ten,
        ngay_sinh: input.ngay_sinh ? String(input.ngay_sinh).slice(0, 10) : null,
        gioi_tinh: input.gioi_tinh ? String(input.gioi_tinh).trim() : null,
        ngay_vao_vien: new Date(`${vv}T12:00:00`).toISOString(),
        khoa_dieu_tri_id: khoaId,
        is_active: true,
      })
      .select()
      .single();
    if (error) throw error;
    if (khoaId) {
      await supabase.from("nkbv_fact_ba_ngay_khoa").upsert(
        { ma_benh_an: ma, ngay_lich: vv, khoa_id: khoaId, updated_at: new Date().toISOString() },
        { onConflict: "ma_benh_an,ngay_lich" },
      );
    }
    revalidatePath("/giam-sat-nkbv");
    return { success: true as const, data };
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : "Lỗi tạo hồ sơ bệnh án" };
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
