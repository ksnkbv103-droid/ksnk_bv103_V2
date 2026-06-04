"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { normalizeHoSoNhanVienOptionalOrThrow } from "@/lib/master-data/fk-normalize";
import { normalizeAndValidateDmKhoaPhong, validateDanhMucIdByType } from "@/lib/master-data/validation";
import { getActorAuthUserId } from "@/lib/actor-auth-server";
import { resolveSupervisorPolicy } from "@/lib/supervision-policy";
import { verifyPermission } from "@/lib/server-permission";
import { getActorKsnkScope } from "@/lib/actor-ksnk-scope-server";
import { formatUnknownError } from "@/lib/supabase-error-message";
import { assertSupervisionNotLockedForDate } from "@/lib/supervision-module-lock";
import type { ChecklistResult } from "@/types/giam-sat-chung";
import {
  ExistingSessionRow,
  type GscSessionInput,
  normalizeGscModeFields,
  optionalFkFromUnknown,
  parseNgayGiamSatOrNull,
  resolveGscModeIds,
  resolveScoringSummary,
  validateGscModeFields,
} from "./giam-sat-chung-write-helpers";
import { chunkIdsForSupabaseInFilter, collectImportSessionIdsFromRows } from "@/lib/supervision/import-session-ids";
import { resolveBangKiemPersistFields } from "../lib/resolve-loai-bang-kiem-persist";
import { resolveGscScopedKhoaId } from "../lib/gsc-khoa-scope";
import { parseGscImportResults } from "../lib/gsc-import-results";
import { revalidateGscPaths } from "../lib/revalidate-gsc-paths";

function mapResultsToJsonb(results: ChecklistResult[]) {
  return (results || []).map((r) => ({
    criterion_id: r.criterionId,
    value: r.value,
    note: r.note ?? null,
    weight_type: r.weightType ?? null,
    is_red_flag: r.isRedFlag ?? false,
    gia_tri_so: r.gia_tri_so ?? null,
    gia_tri_lua_chon: r.gia_tri_lua_chon ?? null,
  }));
}

/**
 * Import / upsert phiên Giám sát chung (theo ma_phien hoặc id).
 * Khi có `results_jsonb` trong file → tính điểm giống luồng form; không có → chỉ metadata phiên.
 */
export async function importGiamSatChungData(rows: Record<string, unknown>[]) {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyPermission("GIAM_SAT_CHUNG", "import");
    const actorAuthUserId = await getActorAuthUserId();
    const scope = await getActorKsnkScope();
    const sessionIdsFromFile = collectImportSessionIdsFromRows(rows || []);
    const existingIds = new Set<string>();
    for (const chunk of chunkIdsForSupabaseInFilter(sessionIdsFromFile)) {
      const { data: existingChunk, error: exErr } = await supabase
        .from("gstt_fact_chung_sessions")
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
      const scopedKhoa = resolveGscScopedKhoaId(
        { isMangLuoiKsnk: scope.isMangLuoiKsnk, actorKhoaId: scope.actorKhoaId ?? null },
        String(row.khoa_id || "").trim() || null,
      );
      if (!scopedKhoa.ok) {
        throw new Error(scopedKhoa.error);
      }
      const khoaRowNorm = await normalizeAndValidateDmKhoaPhong({
        supabase,
        idRaw: scopedKhoa.khoaId,
        fieldLabel: "Khoa phòng",
      });
      await validateDanhMucIdByType({
        supabase,
        id: optionalFkFromUnknown(row.khu_vuc_id),
        maLoai: "KHU_VUC_GIAM_SAT",
        fieldLabel: "Khu vực giám sát",
      });
      await validateDanhMucIdByType({
        supabase,
        id: optionalFkFromUnknown(row.nghe_nghiep_id),
        maLoai: "NGHE_NGHIEP",
        fieldLabel: "Nghề nghiệp",
      });
      const nguoiGsImport = await normalizeHoSoNhanVienOptionalOrThrow(
        supabase,
        row.nguoi_giam_sat_id,
        "Người giám sát",
      );
      if (!nguoiGsImport) {
        throw new Error("Import Giám sát chung: nguoi_giam_sat_id là bắt buộc và phải hợp lệ.");
      }
      const { hinh: hinhFromRow, cach, hinh_id, cach_id } = normalizeGscModeFields(row as GscSessionInput);
      const policy = await resolveSupervisorPolicy({
        supabase,
        supervisorId: nguoiGsImport,
        selectedKhoaId: khoaRowNorm,
        actorAuthUserId,
      });
      const hinh = policy.derivedHinhThuc || hinhFromRow;
      validateGscModeFields(hinh, cach);
      const modeIds = await resolveGscModeIds(supabase, { hinh, cach, hinh_id, cach_id });
      const nhanVienImport = await normalizeHoSoNhanVienOptionalOrThrow(
        supabase,
        row.nhan_vien_id,
        "Nhân viên (đối tượng)",
      );
      const loaiRaw = row.loai_bang_kiem != null ? String(row.loai_bang_kiem).trim() : "";
      const bangKiem = loaiRaw ? await resolveBangKiemPersistFields(supabase, loaiRaw) : null;
      const ngayGs = parseNgayGiamSatOrNull(row.ngay_giam_sat);
      await assertSupervisionNotLockedForDate(supabase, "GSC", ngayGs);

      const importResults = parseGscImportResults(row.results_jsonb);
      const hasResults = importResults.length > 0;
      let tong_diem: number | null = row.tong_diem != null ? Number(row.tong_diem) : null;
      let dat_tron_goi: boolean | null = null;
      let du_lieu_nghi_van = false;
      let results_jsonb: ReturnType<typeof mapResultsToJsonb> | null = null;

      if (hasResults && bangKiem?.bang_kiem_id) {
        const scoring = await resolveScoringSummary(supabase, bangKiem.bang_kiem_id, importResults, {
          thoi_gian_bat_dau: String(row.thoi_gian_bat_dau ?? "").trim() || null,
          thoi_gian_ket_thuc: String(row.thoi_gian_ket_thuc ?? "").trim() || null,
        });
        tong_diem = scoring.tong_diem;
        dat_tron_goi = scoring.dat_tron_goi;
        du_lieu_nghi_van = scoring.du_lieu_nghi_van;
        results_jsonb = mapResultsToJsonb(importResults);
      }

      const payload = {
        bang_kiem_id: bangKiem?.bang_kiem_id ?? null,
        khoa_id: khoaRowNorm,
        khu_vuc_id: optionalFkFromUnknown(row.khu_vuc_id),
        vi_tri: row.vi_tri || null,
        hinh_thuc_id: modeIds.hinh_thuc_id,
        cach_thuc_id: modeIds.cach_thuc_id,
        nguoi_giam_sat_id: nguoiGsImport,
        nhan_vien_id: nhanVienImport,
        nghe_nghiep_id: optionalFkFromUnknown(row.nghe_nghiep_id),
        ngay_giam_sat: ngayGs,
        thoi_gian_bat_dau: String(row.thoi_gian_bat_dau ?? "").trim() || null,
        thoi_gian_ket_thuc: String(row.thoi_gian_ket_thuc ?? "").trim() || null,
        tong_diem,
        dat_tron_goi,
        du_lieu_nghi_van,
        results_jsonb,
        ghi_chu_chung: row.ghi_chu_chung || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      if (sessionId && existingIds.has(sessionId)) {
        const { error: updateErr } = await supabase
          .from("gstt_fact_chung_sessions")
          .update(payload)
          .eq("id", sessionId);
        if (updateErr) throw updateErr;
      } else {
        const insertRow = sessionId ? { ...payload, id: sessionId } : payload;
        const { error } = await supabase.from("gstt_fact_chung_sessions").insert(insertRow);
        if (error) throw error;
      }
    }
    revalidateGscPaths();
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: formatUnknownError(error) };
  }
}
