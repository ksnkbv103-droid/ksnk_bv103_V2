"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { normalizeHoSoNhanVienOptionalOrThrow } from "@/lib/master-data/fk-normalize";
import { normalizeAndValidateDmKhoaPhong, validateDanhMucIdByType } from "@/lib/master-data/validation";
import { getActorAuthUserId } from "@/lib/actor-auth-server";
import { resolveSupervisorPolicy } from "@/lib/supervision-policy";
import { verifyPermission } from "@/lib/server-permission";
import {
  formatVstKhoaFkViolation,
  type ExistingSessionRow,
  type ImportRow,
  normalizeVstModeFields,
  optionalFkFromUnknown,
  validateVstModeFields,
  vstWriteErrorMessage,
} from "./vst-write.helpers";
import { chunkIdsForSupabaseInFilter, collectImportSessionIdsFromRows } from "@/lib/supervision/import-session-ids";

export async function importVSTData(rows: ImportRow[]) {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyPermission("GIAM_SAT_VST", "import");
    const actorAuthUserId = await getActorAuthUserId();
    const sessionIdsFromFile = collectImportSessionIdsFromRows(rows || []);
    const existingIds = new Set<string>();
    for (const chunk of chunkIdsForSupabaseInFilter(sessionIdsFromFile)) {
      const { data: existingChunk, error: exErr } = await supabase
        .from("fact_giam_sat_vst_sessions")
        .select("id")
        .in("id", chunk);
      if (exErr) throw exErr;
      for (const row of (existingChunk || []) as ExistingSessionRow[]) {
        const id = String(row.id || "").trim();
        if (id) existingIds.add(id);
      }
    }
    for (const row of rows || []) {
      const sessionId = String(row.ma_phien || row.id || "").trim();
      const khoaNorm = await normalizeAndValidateDmKhoaPhong({
        supabase,
        idRaw: row.khoa_id,
        fieldLabel: "Khoa phòng",
      });
      await validateDanhMucIdByType({
        supabase,
        id: optionalFkFromUnknown(row.khu_vuc_id),
        maLoai: "KHU_VUC_GIAM_SAT",
        fieldLabel: "Khu vực giám sát",
      });
      const nguoiGsImport = await normalizeHoSoNhanVienOptionalOrThrow(
        supabase,
        row.nguoi_giam_sat_id,
        "Người giám sát",
      );
      if (!nguoiGsImport) {
        throw new Error("Import VST: nguoi_giam_sat_id là bắt buộc và phải hợp lệ.");
      }
      const { cach } = normalizeVstModeFields(row);
      const policy = await resolveSupervisorPolicy({
        supabase,
        supervisorId: nguoiGsImport,
        selectedKhoaId: khoaNorm,
        actorAuthUserId,
      });
      const hinh = policy.derivedHinhThuc;
      validateVstModeFields(hinh, cach);
      const payload = {
        khoa_id: khoaNorm,
        khu_vuc_id: optionalFkFromUnknown(row.khu_vuc_id),
        vi_tri_cu_the: row.vi_tri_cu_the || null,
        hinh_thuc_giam_sat: hinh,
        cach_thuc_giam_sat: cach,
        nguoi_giam_sat_id: nguoiGsImport,
        ngay_giam_sat: row.ngay_giam_sat || null,
        thoi_gian_bat_dau: row.thoi_gian_bat_dau || null,
        thoi_gian_ket_thuc: row.thoi_gian_ket_thuc || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      };
      if (sessionId && existingIds.has(sessionId))
        await supabase.from("fact_giam_sat_vst_sessions").update(payload).eq("id", sessionId);
      else {
        const { error } = await supabase.from("fact_giam_sat_vst_sessions").insert(payload);
        if (error) throw error;
      }
    }
    // Import only upserts rows from file; never disable missing sessions implicitly.
    revalidatePath("/giam-sat-vst");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: formatVstKhoaFkViolation(vstWriteErrorMessage(error)) };
  }
}
