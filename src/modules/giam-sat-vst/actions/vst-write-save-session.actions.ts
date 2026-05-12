"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { VSTObservation } from "../data";
import { normalizeHoSoNhanVienOptionalOrThrow } from "@/lib/master-data/fk-normalize";
import { normalizeAndValidateDmKhoaPhong, validateDanhMucIdByType } from "@/lib/master-data/validation";
import { getActorAuthUserId, getActorNhanSuId } from "@/lib/actor-auth-server";
import {
  isSupervisionSessionMutationExpired,
  SUPERVISION_SESSION_MUTATION_EXPIRED_VI,
} from "@/lib/supervision-mutation-window";
import { resolveSupervisorPolicy } from "@/lib/supervision-policy";
import { verifyPermission } from "@/lib/server-permission";
import {
  formatVstKhoaFkViolation,
  logVstSaveDebug,
  normalizeVstModeFields,
  type SessionInput,
  validateVstModeFields,
  vstWriteErrorMessage,
} from "./vst-write.helpers";

import { vstSaveSessionSchema } from "@/lib/validations";

export type SaveVSTSessionOpts = { existingSessionId?: string | null };

/** Lưu phiên mới hoặc cập nhật tại chỗ (cùng UUID) — chỉ chủ phiên, trong 30 phút. */
export async function saveVSTSession(
  sessionData: SessionInput,
  observations: VSTObservation[],
  opts?: SaveVSTSessionOpts,
) {
  const supabase = createAdminSupabaseClient();
  const existingSessionId = String(opts?.existingSessionId ?? "").trim();
  let createdSessionId: string | null = null;
  try {
    // 1. Validate permissions
    await verifyPermission("GIAM_SAT_VST", existingSessionId ? "edit" : "create");

    // 2. Validate input schema with Zod
    const parsed = vstSaveSessionSchema.safeParse({ session: sessionData, observations });
    if (!parsed.success) {
      return { success: false, error: "Dữ liệu không hợp lệ: " + parsed.error.issues.map((e) => e.message).join(", ") };
    }
    const khoaSessionNorm = await normalizeAndValidateDmKhoaPhong({
      supabase,
      idRaw: sessionData.khoa_id,
      fieldLabel: "Khoa phòng",
    });
    await validateDanhMucIdByType({
      supabase,
      id: sessionData.khu_vuc_id || null,
      maLoai: "KHU_VUC_GIAM_SAT",
      fieldLabel: "Khu vực giám sát",
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
    const { cach } = normalizeVstModeFields(sessionData);
    const policy = await resolveSupervisorPolicy({
      supabase,
      supervisorId: nguoiGsNorm,
      selectedKhoaId: khoaSessionNorm,
      actorAuthUserId,
    });
    const hinh = policy.derivedHinhThuc;
    validateVstModeFields(hinh, cach);
    const ngayGiamSat = sessionData.ngay_giam_sat?.trim();
    if (!ngayGiamSat) throw new Error("Ngày giám sát là bắt buộc.");
    if ((observations || []).some((obs) => String(obs.khoa_id || "") !== String(sessionData.khoa_id || ""))) {
      throw new Error("Dữ liệu lệch: khoa_id trong cơ hội giám sát không khớp khoa của phiên.");
    }
    logVstSaveDebug("Bắt đầu lưu phiên", {
      obsCount: observations.length,
      khoa_id: sessionData.khoa_id,
      existingSessionId: existingSessionId || null,
    });

    const sessionRowPayload = {
      khoa_id: khoaSessionNorm,
      khu_vuc_id: sessionData.khu_vuc_id,
      vi_tri_cu_the: sessionData.vi_tri,
      hinh_thuc_giam_sat: hinh,
      cach_thuc_giam_sat: cach,
      nguoi_giam_sat_id: nguoiGsNorm,
      ngay_giam_sat: ngayGiamSat,
      thoi_gian_bat_dau: sessionData.thoi_gian_bat_dau || null,
      thoi_gian_ket_thuc: sessionData.thoi_gian_ket_thuc || null,
    };

    let sessionId: string;

    if (existingSessionId) {
      if (!actorNhanSuId) throw new Error("Không xác định được người giám sát của bạn.");

      const { data: existing, error: exErr } = await supabase
        .from("fact_giam_sat_vst_sessions")
        .select("id,nguoi_giam_sat_id,is_active,created_at")
        .eq("id", existingSessionId)
        .maybeSingle();
      if (exErr) throw exErr;
      if (!existing) throw new Error("Phiên không còn tồn tại.");
      if (typeof existing.is_active === "boolean" && existing.is_active === false) {
        throw new Error("Phiên đã bị vô hiệu, không sửa được.");
      }
      if (String(existing.nguoi_giam_sat_id || "") !== String(actorNhanSuId)) {
        throw new Error("Chỉ người giám sát đã ghi nhận phiên này mới được sửa.");
      }
      if (isSupervisionSessionMutationExpired(existing.created_at)) {
        throw new Error(SUPERVISION_SESSION_MUTATION_EXPIRED_VI);
      }

      const { error: delObsErr } = await supabase.from("fact_giam_sat_vst").delete().eq("session_id", existingSessionId);
      if (delObsErr) throw delObsErr;

      const { error: upErr } = await supabase
        .from("fact_giam_sat_vst_sessions")
        .update({
          ...sessionRowPayload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingSessionId);
      if (upErr) throw upErr;

      sessionId = existingSessionId;
    } else {
      const { data: session, error: sessionError } = await supabase
        .from("fact_giam_sat_vst_sessions")
        .insert(sessionRowPayload)
        .select()
        .single();

      if (sessionError) {
        if (process.env.NODE_ENV !== "production") console.error("[VST save] Lỗi insert session:", sessionError.message);
        throw sessionError;
      }
      createdSessionId = session.id;
      sessionId = session.id;
    }

    logVstSaveDebug("Đã có session id", { sessionId });

    const allKhoaIds = Array.from(new Set(observations.map(o => o.khoa_id).filter(Boolean)));
    const khoaMap = new Map<string, string>();
    if (allKhoaIds.length > 0) {
      const { data: khoas } = await supabase.from("dm_khoa_phong").select("id").in("id", allKhoaIds);
      (khoas || []).forEach(k => khoaMap.set(k.id, k.id));
    }

    const normalizedObservations = observations.map(obs => {
      const kId = obs.khoa_id ? khoaMap.get(obs.khoa_id) : null;
      if (obs.khoa_id && !kId) {
        // Có thể throw hoặc fallback, ở đây ta fallback về khoa của phiên nếu cần
      }
      return { ...obs, khoa_id: kId || khoaSessionNorm };
    });

    const recordsToInsert = normalizedObservations.flatMap((obs) =>
      obs.opportunities.map((opp) => {
        const isMissed = opp.hanh_dong === "Bỏ sót";
        const khoaDetailId =
          (obs.khoa_id && String(obs.khoa_id).trim()) || khoaSessionNorm || null;
        return {
          session_id: sessionId,
          nhan_vien_id: obs.nhan_vien_id || null,
          ten_nhan_vien_ngoai: obs.ten_nhan_vien_ngoai || null,
          khoa_id: khoaDetailId,
          khu_vuc: obs.khu_vuc,
          vi_tri: obs.vi_tri,
          nghe_nghiep: obs.nghe_nghiep,
          ngay_giam_sat: obs.ngay_giam_sat,
          thoi_diem: opp.thoi_diems.join(", "),
          hanh_dong: opp.hanh_dong,
          dung_ky_thuat: isMissed ? null : opp.dung_ky_thuat,
          du_thoi_gian: isMissed ? null : opp.du_thoi_gian,
          co_deo_gang: isMissed ? (opp.co_deo_gang ?? null) : null,
          thoi_gian_ghi_nhan: opp.thoi_gian_ghi_nhan || null,
        };
      }),
    );

    logVstSaveDebug(`Chuẩn bị insert ${recordsToInsert.length} cơ hội`);

    const { error: obsError } = await supabase.from("fact_giam_sat_vst").insert(recordsToInsert);

    if (obsError) {
      if (process.env.NODE_ENV !== "production") console.error("[VST save] Lỗi insert observations:", obsError.message);
      throw obsError;
    }

    logVstSaveDebug("Insert observations xong");

    revalidatePath("/giam-sat-vst/lich-su");
    return { success: true, sessionId, message: "Lưu phiên giám sát thành công" };
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[VST save] Lỗi:", error instanceof Error ? error.message : error);
    }
    if (createdSessionId && !existingSessionId) {
      await supabase.from("fact_giam_sat_vst_sessions").delete().eq("id", createdSessionId);
    }
    return { success: false, error: formatVstKhoaFkViolation(vstWriteErrorMessage(error)) };
  }
}
