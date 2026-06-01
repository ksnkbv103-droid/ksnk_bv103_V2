"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { ChecklistResult } from "@/types/giam-sat-chung";
import { normalizeHoSoNhanVienOptionalOrThrow } from "@/lib/master-data/fk-normalize";
import { normalizeAndValidateDmKhoaPhong, validateDanhMucIdByType } from "@/lib/master-data/validation";
import { getActorAuthUserId, getActorNhanSuId } from "@/lib/actor-auth-server";
import { resolveSupervisorPolicy } from "@/lib/supervision-policy";
import { hasRBACAdminSupervisionBypass, verifyPermission } from "@/lib/server-permission";
import { getActorKsnkScope } from "@/lib/actor-ksnk-scope-server";
import { formatUnknownError } from "@/lib/supabase-error-message";
import { isReplayCameraSupervisionCachThuc } from "@/lib/supervision-session-time";
import {
  calculateScore,
  GscSessionInput,
  normalizeGscModeFields,
  resolveGscModeIds,
  parseNgayGiamSatOrNull,
  resolveScoringSummary,
  validateGscModeFields,
} from "./giam-sat-chung-write-helpers";
import { resolveBangKiemPersistFields } from "../lib/resolve-loai-bang-kiem-persist";
import { gscSaveSessionSchema } from "@/lib/validations";

import {
  isSupervisionSessionMutationExpired,
  SUPERVISION_SESSION_MUTATION_EXPIRED_VI,
} from "@/lib/supervision-mutation-window";
import { resolveGscScopedKhoaId } from "../lib/gsc-khoa-scope";

type SaveGiamSatChungOpts = { existingSessionId?: string | null };

/** Lưu phiên mới hoặc cập nhật tại chỗ (cùng UUID) nếu `existingSessionId` — chỉ chủ phiên, trong 30 phút. */
export async function saveGiamSatChung(
  sessionData: GscSessionInput,
  results: ChecklistResult[],
  opts?: SaveGiamSatChungOpts,
) {
  const supabase = createAdminSupabaseClient();
  try {
    const existingSessionId = String(opts?.existingSessionId ?? "").trim();

    // 1. Validate permissions
    await verifyPermission("GIAM_SAT_CHUNG", existingSessionId ? "edit" : "create");

    // 2. Validate input schema with Zod
    const parsed = gscSaveSessionSchema.safeParse({ session: sessionData, results });
    if (!parsed.success) {
      return { success: false, error: "Dữ liệu không hợp lệ: " + parsed.error.issues.map((e) => e.message).join(", ") };
    }
    const scope = await getActorKsnkScope();
    const scopedKhoa = resolveGscScopedKhoaId(
      { isMangLuoiKsnk: scope.isMangLuoiKsnk, actorKhoaId: scope.actorKhoaId ?? null },
      String(sessionData.khoa_id || "").trim() || null,
    );
    if (!scopedKhoa.ok) {
      return { success: false, error: scopedKhoa.error };
    }
    const khoaNorm = await normalizeAndValidateDmKhoaPhong({
      supabase,
      idRaw: scopedKhoa.khoaId,
      fieldLabel: "Khoa phòng",
    });
    await validateDanhMucIdByType({
      supabase,
      id: sessionData.khu_vuc_id || null,
      maLoai: "KHU_VUC_GIAM_SAT",
      fieldLabel: "Khu vực giám sát",
    });
    await validateDanhMucIdByType({
      supabase,
      id: sessionData.nghe_nghiep_id || null,
      maLoai: "NGHE_NGHIEP",
      fieldLabel: "Nghề nghiệp",
    });
    const actorAuthUserId = await getActorAuthUserId();
    const actorNhanSuId = await getActorNhanSuId();

    const nguoiGsId = sessionData.nguoi_giam_sat_id || actorNhanSuId;
    const nguoiGsNorm = await normalizeHoSoNhanVienOptionalOrThrow(
      supabase,
      nguoiGsId,
      "Người giám sát",
    );
    if (!nguoiGsNorm) {
      throw new Error("Không xác định được người giám sát. Vui lòng chọn người giám sát hoặc kiểm tra hồ sơ nhân sự của bạn.");
    }
    const { cach, hinh_id, cach_id } = normalizeGscModeFields(sessionData);
    const policy = await resolveSupervisorPolicy({
      supabase,
      supervisorId: nguoiGsNorm,
      selectedKhoaId: khoaNorm,
      actorAuthUserId,
    });
    const hinh = policy.derivedHinhThuc;
    validateGscModeFields(hinh, cach);
    const modeIds = await resolveGscModeIds(supabase, { hinh, cach, hinh_id, cach_id });
    if (isReplayCameraSupervisionCachThuc(cach)) {
      const bd = String(sessionData.thoi_gian_bat_dau ?? "").trim();
      const kt = String(sessionData.thoi_gian_ket_thuc ?? "").trim();
      if (!bd || !kt) {
        throw new Error("Giám sát lại qua camera: vui lòng nhập đủ Ngày giám sát và khung giờ Từ – Đến ở phần đầu phiên.");
      }
    }
    /** Nhập tay tên đối tượng (không có hồ sơ mdm_nhan_su) — bỏ qua FK check, lưu chuỗi tên. */
    const isManualNv = Boolean(sessionData.is_manual_nhan_vien);
    const tenManualNv = isManualNv
      ? String(sessionData.ten_manual_nhan_vien ?? "").trim() || null
      : null;
    if (isManualNv && !tenManualNv) {
      throw new Error("Vui lòng nhập tên đối tượng (đã chọn 'Nhập tay').");
    }
    const nhanVienNorm = isManualNv
      ? null
      : await normalizeHoSoNhanVienOptionalOrThrow(
          supabase,
          sessionData.nhan_vien_id,
          "Đối tượng (nhân viên)",
        );
    const bangKiem = await resolveBangKiemPersistFields(supabase, sessionData.loai_bang_kiem);
    const thoiGianGhiNhan = isReplayCameraSupervisionCachThuc(cach)
      ? String(sessionData.thoi_gian_ket_thuc ?? "").trim() || new Date().toISOString()
      : new Date().toISOString();

    const boSungRaw = Boolean(sessionData.is_bo_sung_nguoi_benh);
    const maNb = String(sessionData.ma_nguoi_benh ?? "").trim() || null;
    const tenNb = String(sessionData.ten_nguoi_benh ?? "").trim() || null;
    const giuongNb = String(sessionData.so_giuong_nguoi_benh ?? "").trim() || null;
    const boSungEffective = boSungRaw && Boolean(maNb || tenNb || giuongNb);

    const thoiGianBatDauNorm = String(sessionData.thoi_gian_bat_dau ?? "").trim() || null;
    const thoiGianKetThucNorm = String(sessionData.thoi_gian_ket_thuc ?? "").trim() || null;

    // Slice 4 hook (reform v4): scoring engine theo cach_tinh_diem nếu bảng kiểm
    // đã được seed metadata ở Slice 1; fallback engine cũ cho bảng kiểm legacy.
    const scoring = await resolveScoringSummary(
      supabase,
      bangKiem.bang_kiem_id,
      results,
      { thoi_gian_bat_dau: thoiGianBatDauNorm, thoi_gian_ket_thuc: thoiGianKetThucNorm },
    );

    const sessionPayload = {
      bang_kiem_id: bangKiem.bang_kiem_id,
      khoa_id: khoaNorm,
      khu_vuc_id: sessionData.khu_vuc_id || null,
      vi_tri: sessionData.vi_tri,
      hinh_thuc_id: modeIds.hinh_thuc_id,
      cach_thuc_id: modeIds.cach_thuc_id,
      nguoi_giam_sat_id: nguoiGsNorm,
      is_giam_sat_ca_nhan: sessionData.is_giam_sat_ca_nhan || false,
      nhan_vien_id: nhanVienNorm,
      nghe_nghiep_id: sessionData.nghe_nghiep_id || null,
      ngay_giam_sat: parseNgayGiamSatOrNull(sessionData.ngay_giam_sat),
      thoi_gian_bat_dau: thoiGianBatDauNorm,
      thoi_gian_ket_thuc: thoiGianKetThucNorm,
      thoi_gian_ghi_nhan: thoiGianGhiNhan,
      tong_diem: scoring.tong_diem ?? calculateScore(results),
      dat_tron_goi: scoring.dat_tron_goi,
      du_lieu_nghi_van: scoring.du_lieu_nghi_van,
      ghi_chu_chung: sessionData.ghi_chu_chung,
      results_jsonb: (results || []).map((r) => ({
        criterion_id: r.criterionId,
        value: r.value,
        note: r.note ?? null,
        weight_type: r.weightType ?? null,
        is_red_flag: r.isRedFlag ?? false,
        image_url: r.image_url ?? null,
        thoi_diem_ghi: (r as ChecklistResult & { thoi_diem_ghi?: string | null })
          .thoi_diem_ghi ?? null,
        gia_tri_so: (r as ChecklistResult & { gia_tri_so?: number | null })
          .gia_tri_so ?? null,
        gia_tri_lua_chon: (r as ChecklistResult & { gia_tri_lua_chon?: string | null })
          .gia_tri_lua_chon ?? null,
      })),
      metadata: {
        is_manual_nhan_vien: isManualNv,
        ten_manual_nhan_vien: tenManualNv,
        is_bo_sung_nguoi_benh: boSungEffective,
        ma_nguoi_benh: boSungEffective ? maNb : null,
        ten_nguoi_benh: boSungEffective ? tenNb : null,
        so_giuong_nguoi_benh: boSungEffective ? giuongNb : null,
      },
    };

    let sessionId: string;

    if (existingSessionId) {
      const adminBypass = await hasRBACAdminSupervisionBypass();
      if (!adminBypass && !actorNhanSuId) throw new Error("Không xác định được người giám sát của bạn.");

      const { data: existing, error: exErr } = await supabase
        .from("gstt_fact_chung_sessions")
        .select("id,nguoi_giam_sat_id,is_active,created_at")
        .eq("id", existingSessionId)
        .maybeSingle();
      if (exErr) throw exErr;
      if (!existing) throw new Error("Phiên không còn tồn tại.");
      if (existing.is_active === false) throw new Error("Phiên đã bị vô hiệu, không sửa được.");
      if (!adminBypass) {
        if (String(existing.nguoi_giam_sat_id || "") !== String(actorNhanSuId)) {
          throw new Error("Chỉ người giám sát đã ghi nhận phiên này mới được sửa.");
        }
        if (isSupervisionSessionMutationExpired(existing.created_at)) {
          throw new Error(SUPERVISION_SESSION_MUTATION_EXPIRED_VI);
        }
      }

      const { error: upErr } = await supabase
        .from("gstt_fact_chung_sessions")
        .update({
          ...sessionPayload,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingSessionId);
      if (upErr) throw upErr;

      sessionId = existingSessionId;
    } else {
      const { data: session, error: sError } = await supabase
        .from("gstt_fact_chung_sessions")
        .insert({
          ...sessionPayload,
          is_active: true,
        })
        .select()
        .single();
      if (sError) throw sError;
      sessionId = session.id;
    }

    revalidatePath("/giam-sat-chung");
    return { success: true, sessionId };
  } catch (error: unknown) {
    return { success: false, error: formatUnknownError(error) };
  }
}
