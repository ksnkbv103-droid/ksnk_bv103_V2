"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { VSTObservation } from "../lib/vst-constants";
import { normalizeHoSoNhanVienOptionalOrThrow } from "@/lib/master-data/fk-normalize";
import { normalizeAndValidateDmKhoaPhong, validateDanhMucIdByType } from "@/lib/master-data/validation";
import { getActorAuthUserId, getActorNhanSuId } from "@/lib/actor-auth-server";
import {
  isSupervisionSessionMutationExpired,
  SUPERVISION_SESSION_MUTATION_EXPIRED_VI,
} from "@/lib/supervision-mutation-window";
import { resolveSupervisorPolicy } from "@/lib/supervision-policy";
import { getActorKsnkScope } from "@/lib/actor-ksnk-scope-server";
import { hasRBACAdminSupervisionBypass, verifyPermission } from "@/lib/server-permission";
import { resolveVstScopedKhoaId } from "../lib/vst-khoa-scope";
import {
  formatVstKhoaFkViolation,
  logVstSaveDebug,
  normalizeVstModeFields,
  type SessionInput,
  validateVstModeFields,
  vstWriteErrorMessage,
} from "./vst-write.helpers";
import {
  buildVstBoSungNbMetadata,
  isVstSessionsMetadataColumnMissing,
} from "../lib/vst-bo-sung-nguoi-benh";

import { assertSupervisionNotLockedForDate } from "@/lib/supervision-module-lock";
import { assertKhuVucAllowedForKhoa } from "@/lib/khu-vuc-giam-sat-server";
import {
  validateSixSessionDimensions,
  validateVstObservationNhanVien,
} from "@/lib/validations/giam-sat-session-dimensions";
import { vstSaveSessionSchema } from "@/lib/validations/giam-sat-vst.validations";

type SaveVSTSessionOpts = { existingSessionId?: string | null };

const VST_OBS_RESTORE_COLUMNS =
  "id, session_id, nhan_vien_id, khoa_id, vi_tri, ngay_giam_sat, thoi_diem, hanh_dong, dung_ky_thuat, du_thoi_gian, co_deo_gang, thoi_gian_ghi_nhan, ghi_chu, khu_vuc_id, nghe_nghiep_id, metadata, created_at";

/** Lưu phiên mới hoặc cập nhật tại chỗ (cùng UUID) — chỉ chủ phiên, trong 30 phút. */
export async function saveVSTSession(
  sessionData: SessionInput,
  observations: VSTObservation[],
  opts?: SaveVSTSessionOpts,
) {
  const supabase = createAdminSupabaseClient();
  const existingSessionId = String(opts?.existingSessionId ?? "").trim();
  let createdSessionId: string | null = null;
  let pendingObservationRestore = false;
  let previousObservationRows: Record<string, unknown>[] | null = null;
  try {
    // 1. Validate permissions
    await verifyPermission("GIAM_SAT_VST", existingSessionId ? "edit" : "create");

    // 2. Validate input schema with Zod
    const parsed = vstSaveSessionSchema.safeParse({ session: sessionData, observations });
    if (!parsed.success) {
      return { success: false, error: "Dữ liệu không hợp lệ: " + parsed.error.issues.map((e) => e.message).join(", ") };
    }
    const lockedSession = parsed.data.session;
    const lockedKhuVucId = lockedSession.khu_vuc_id;
    const actorScope = await getActorKsnkScope();
    const khoaScoped = resolveVstScopedKhoaId(
      { isMangLuoiKsnk: actorScope.isMangLuoiKsnk, actorKhoaId: actorScope.actorKhoaId ?? null },
      lockedSession.khoa_id || null,
    );
    if (!khoaScoped.ok) {
      return { success: false, error: khoaScoped.error };
    }
    const khoaSessionNorm = await normalizeAndValidateDmKhoaPhong({
      supabase,
      idRaw: khoaScoped.khoaId,
      fieldLabel: "Khoa phòng",
    });
    await validateDanhMucIdByType({
      supabase,
      id: lockedKhuVucId,
      maLoai: "KHU_VUC_GIAM_SAT",
      fieldLabel: "Khu vực giám sát",
    });
    // GS-01: 6 chiều — chỉ siết khi tạo mới (grandfather phiên cũ khi sửa).
    if (!existingSessionId) {
      const firstObs = observations[0];
      const dimErr = validateSixSessionDimensions({
        khoa_id: khoaSessionNorm,
        khu_vuc_id: lockedKhuVucId,
        vi_tri: lockedSession.vi_tri,
        doi_tuong_loai: "NHAN_VIEN",
        nhan_vien_id: firstObs?.nhan_vien_id,
        ten_nhan_vien_ngoai: firstObs?.ten_nhan_vien_ngoai,
        gan_nb: Boolean(lockedSession.is_bo_sung_nguoi_benh),
      });
      if (dimErr) return { success: false, error: dimErr };
      for (let i = 0; i < observations.length; i++) {
        const nvErr = validateVstObservationNhanVien(observations[i]!);
        if (nvErr) {
          return { success: false, error: `Đối tượng ${i + 1}: ${nvErr}` };
        }
      }
      await assertKhuVucAllowedForKhoa({
        supabase,
        khoaId: String(khoaSessionNorm ?? "").trim(),
        khuVucId: String(lockedKhuVucId ?? "").trim(),
      });
    }
    for (const obs of observations) {
      const ngheId = String(obs.nghe_nghiep_id || "").trim();
      if (!ngheId) {
        return { success: false, error: "Nghề nghiệp là bắt buộc cho mọi đối tượng giám sát." };
      }
      await validateDanhMucIdByType({
        supabase,
        id: ngheId,
        maLoai: "NGHE_NGHIEP",
        fieldLabel: "Nghề nghiệp",
      });
    }
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
    const { cach, hinh_id, cach_id } = normalizeVstModeFields(sessionData);
    const policy = await resolveSupervisorPolicy({
      supabase,
      supervisorId: nguoiGsNorm,
      selectedKhoaId: khoaSessionNorm,
      actorAuthUserId,
    });
    const hinh = policy.derivedHinhThuc;
    
    // Nếu front-end không gửi hinh_id (UUID), ta cố gắng lấy từ policy/danh mục
    let effectiveHinhThucId = hinh_id;
    if (!effectiveHinhThucId) {
       const { data: ht } = await supabase.from("gstt_dm_hinh_thuc_giam_sat").select("id").eq("ten_hinh_thuc", hinh).maybeSingle();
       if (ht) effectiveHinhThucId = ht.id;
    }

    validateVstModeFields(hinh, cach);
    const ngayGiamSat = sessionData.ngay_giam_sat?.trim();
    if (!ngayGiamSat) throw new Error("Ngày giám sát là bắt buộc.");
    await assertSupervisionNotLockedForDate(supabase, "VST", ngayGiamSat);
    if ((observations || []).some((obs) => String(obs.khoa_id || "") !== String(khoaSessionNorm || ""))) {
      throw new Error("Dữ liệu lệch: khoa_id trong cơ hội giám sát không khớp khoa của phiên.");
    }
    logVstSaveDebug("Bắt đầu lưu phiên", {
      obsCount: observations.length,
      khoa_id: sessionData.khoa_id,
      existingSessionId: existingSessionId || null,
    });

    const patientMetadata = buildVstBoSungNbMetadata(sessionData);
    const sessionRowBase = {
      khoa_id: khoaSessionNorm,
      khu_vuc_id: lockedKhuVucId,
      vi_tri_cu_the: sessionData.vi_tri,
      hinh_thuc_id: effectiveHinhThucId,
      cach_thuc_id: cach_id,
      nguoi_giam_sat_id: nguoiGsNorm,
      ngay_giam_sat: ngayGiamSat,
      thoi_gian_bat_dau: sessionData.thoi_gian_bat_dau || null,
      thoi_gian_ket_thuc: sessionData.thoi_gian_ket_thuc || null,
    };
    /** Soft-safe: ghi metadata khi cột đã migrate; nếu thiếu cột → bỏ metadata, không reject. */
    let sessionRowPayload: Record<string, unknown> = {
      ...sessionRowBase,
      metadata: patientMetadata,
    };
    let omitSessionMetadata = false;

    const persistSessionRow = async (mode: "insert" | "update", sessionIdForUpdate?: string) => {
      const payload = omitSessionMetadata
        ? { ...sessionRowBase }
        : { ...sessionRowBase, metadata: patientMetadata };
      sessionRowPayload = payload;
      if (mode === "insert") {
        const { data: session, error: sessionError } = await supabase
          .from("gstt_fact_vst_sessions")
          .insert(payload)
          .select()
          .single();
        if (sessionError) {
          if (!omitSessionMetadata && isVstSessionsMetadataColumnMissing(sessionError)) {
            omitSessionMetadata = true;
            logVstSaveDebug("metadata column missing — retry insert without metadata");
            return persistSessionRow("insert");
          }
          return { ok: false as const, error: sessionError };
        }
        return { ok: true as const, session };
      }
      const { error: upErr } = await supabase
        .from("gstt_fact_vst_sessions")
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionIdForUpdate!);
      if (upErr) {
        if (!omitSessionMetadata && isVstSessionsMetadataColumnMissing(upErr)) {
          omitSessionMetadata = true;
          logVstSaveDebug("metadata column missing — retry update without metadata");
          return persistSessionRow("update", sessionIdForUpdate);
        }
        return { ok: false as const, error: upErr };
      }
      return { ok: true as const };
    };

    let sessionId: string;

    if (existingSessionId) {
      const adminBypass = await hasRBACAdminSupervisionBypass();
      if (!adminBypass && !actorNhanSuId) throw new Error("Không xác định được người giám sát của bạn.");

      const { data: existing, error: exErr } = await supabase
        .from("gstt_fact_vst_sessions")
        .select("id,nguoi_giam_sat_id,is_active,created_at")
        .eq("id", existingSessionId)
        .maybeSingle();
      if (exErr) throw exErr;
      if (!existing) throw new Error("Phiên không còn tồn tại.");
      if (typeof existing.is_active === "boolean" && existing.is_active === false) {
        throw new Error("Phiên đã bị vô hiệu, không sửa được.");
      }
      if (!adminBypass) {
        if (String(existing.nguoi_giam_sat_id || "") !== String(actorNhanSuId)) {
          throw new Error("Chỉ người giám sát đã ghi nhận phiên này mới được sửa.");
        }
        if (isSupervisionSessionMutationExpired(existing.created_at)) {
          throw new Error(SUPERVISION_SESSION_MUTATION_EXPIRED_VI);
        }
      }

      sessionId = existingSessionId;
    } else {
      const inserted = await persistSessionRow("insert");
      if (!inserted.ok) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[VST save] Lỗi insert session:", (inserted.error as { message?: string })?.message);
        }
        throw inserted.error;
      }
      createdSessionId = inserted.session.id;
      sessionId = inserted.session.id;
    }

    logVstSaveDebug("Đã có session id", { sessionId });

    const allKhoaIds = Array.from(new Set(observations.map((o) => o.khoa_id).filter(Boolean)));
    const khoaMap = new Map<string, string>();
    if (allKhoaIds.length > 0) {
      const { data: khoas } = await supabase.from("mdm_dm_khoa_phong").select("id").in("id", allKhoaIds);
      (khoas || []).forEach((k) => khoaMap.set(k.id, k.id));
    }

    const normalizedObservations = observations.map((obs) => {
      const kId = obs.khoa_id ? khoaMap.get(obs.khoa_id) : null;
      if (!kId) {
        throw new Error(
          "Khoa trên dòng cơ hội không tồn tại trong danh mục khoa phòng. Vui lòng chọn lại khoa từ danh mục.",
        );
      }
      if (String(kId) !== String(khoaSessionNorm)) {
        throw new Error("Dữ liệu lệch: khoa_id trong cơ hội giám sát không khớp khoa của phiên.");
      }
      return { ...obs, khoa_id: kId };
    });

    const recordsToInsert = normalizedObservations.flatMap((obs) =>
      obs.opportunities.map((opp) => {
        const isMissed = opp.hanh_dong === "Bỏ sót";
        const khoaDetailId = obs.khoa_id;
        const khuVucDetailId = lockedKhuVucId;
        // Slice 8 (giam-sat-tuan-thu reform v4 / JCI 8.0): chỉ ghi nguyên nhân
        // khi cơ hội không tuân thủ — bỏ qua mọi giá trị thừa do form sót lại.
        return {
          session_id: sessionId,
          nhan_vien_id: obs.nhan_vien_id || null,
          khoa_id: khoaDetailId,
          khu_vuc_id: khuVucDetailId,
          vi_tri: obs.vi_tri,
          nghe_nghiep_id: obs.nghe_nghiep_id ?? null,
          ngay_giam_sat: obs.ngay_giam_sat,
          thoi_diem: opp.thoi_diems.join(", "),
          hanh_dong: opp.hanh_dong,
          dung_ky_thuat: isMissed ? null : opp.dung_ky_thuat,
          du_thoi_gian: isMissed ? null : opp.du_thoi_gian,
          co_deo_gang: isMissed ? (opp.co_deo_gang ?? null) : null,
          thoi_gian_ghi_nhan: opp.thoi_gian_ghi_nhan || null,
          metadata: obs.ten_nhan_vien_ngoai ? { ten_nhan_vien_ngoai: obs.ten_nhan_vien_ngoai } : {},
        };
      }),
    );

    logVstSaveDebug(`Chuẩn bị insert ${recordsToInsert.length} cơ hội`);

    if (existingSessionId) {
      const { data: prevRows, error: prevErr } = await supabase
        .from("gstt_fact_vst")
        .select(VST_OBS_RESTORE_COLUMNS)
        .eq("session_id", existingSessionId);
      if (prevErr) throw prevErr;
      previousObservationRows = (prevRows ?? []) as Record<string, unknown>[];
      const { error: delObsErr } = await supabase.from("gstt_fact_vst").delete().eq("session_id", existingSessionId);
      if (delObsErr) throw delObsErr;
      pendingObservationRestore = true;
    }

    const { error: obsError } = await supabase.from("gstt_fact_vst").insert(recordsToInsert);

    if (obsError) {
      if (process.env.NODE_ENV !== "production") console.error("[VST save] Lỗi insert observations:", obsError.message);
      throw obsError;
    }

    if (existingSessionId) {
      const updated = await persistSessionRow("update", existingSessionId);
      if (!updated.ok) throw updated.error;
    }
    // Chỉ tắt cờ sau khi header phiên cũng OK — lỗi update vẫn khôi phục cơ hội cũ.
    pendingObservationRestore = false;

    logVstSaveDebug("Insert observations xong");

    revalidatePath("/giam-sat-vst");
    revalidatePath("/lich-su/vst");
    const { invalidateVstStrategicAnalyticsCache } = await import(
      "@/lib/analytics/strategic-analytics-cache"
    );
    invalidateVstStrategicAnalyticsCache();
    return { success: true, sessionId, message: "Lưu phiên giám sát thành công" };
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[VST save] Lỗi:", error instanceof Error ? error.message : error);
    }
    if (pendingObservationRestore && previousObservationRows?.length) {
      const { error: restoreErr } = await supabase.from("gstt_fact_vst").insert(previousObservationRows);
      if (restoreErr && process.env.NODE_ENV !== "production") {
        console.error("[VST save] Không khôi phục được cơ hội cũ:", restoreErr.message);
      }
    }
    if (createdSessionId && !existingSessionId) {
      await supabase.from("gstt_fact_vst_sessions").delete().eq("id", createdSessionId);
    }
    return { success: false, error: formatVstKhoaFkViolation(vstWriteErrorMessage(error)) };
  }
}
