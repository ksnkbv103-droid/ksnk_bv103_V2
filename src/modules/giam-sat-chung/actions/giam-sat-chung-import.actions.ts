"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { normalizeHoSoNhanVienOptionalOrThrow } from "@/lib/master-data/fk-normalize";
import { normalizeAndValidateDmKhoaPhong, validateDanhMucIdByType } from "@/lib/master-data/validation";
import { getActorAuthUserId } from "@/lib/actor-auth-server";
import { resolveSupervisorPolicy } from "@/lib/supervision-policy";
import { verifyPermission } from "@/lib/server-permission";
import { formatUnknownError } from "@/lib/supabase-error-message";
import {
  ExistingSessionRow,
  normalizeGscModeFields,
  optionalFkFromUnknown,
  validateGscModeFields,
} from "./giam-sat-chung-write-helpers";
import { resolveCanonicalLoaiBangKiemForPersist } from "../lib/resolve-loai-bang-kiem-persist";

/** Import / upsert phiên Giám sát chung (theo ma_phien hoặc id). */
export async function importGiamSatChungData(rows: Record<string, unknown>[]) {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyPermission("GIAM_SAT_CHUNG", "import");
    const actorAuthUserId = await getActorAuthUserId();
    const { data: existing, error: exErr } = await supabase.from("fact_giam_sat_chung_sessions").select("id");
    if (exErr) throw exErr;
    const existingIds = new Set(((existing || []) as ExistingSessionRow[]).map((x) => x.id).filter(Boolean) as string[]);
    for (const row of rows || []) {
      const sessionId = String(row.ma_phien || row.id || "").trim();
      const khoaRowNorm = await normalizeAndValidateDmKhoaPhong({
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
      const { cach } = normalizeGscModeFields(row);
      const policy = await resolveSupervisorPolicy({
        supabase,
        supervisorId: nguoiGsImport,
        selectedKhoaId: khoaRowNorm,
        actorAuthUserId,
      });
      const hinh = policy.derivedHinhThuc;
      validateGscModeFields(hinh, cach);
      const nhanVienImport = await normalizeHoSoNhanVienOptionalOrThrow(
        supabase,
        row.nhan_vien_id,
        "Nhân viên (đối tượng)",
      );
      const loaiRaw = row.loai_bang_kiem != null ? String(row.loai_bang_kiem).trim() : "";
      const loaiBkCanonical = loaiRaw ? await resolveCanonicalLoaiBangKiemForPersist(supabase, loaiRaw) : null;
      const payload = {
        loai_bang_kiem: loaiBkCanonical,
        khoa_id: khoaRowNorm,
        khu_vuc_id: optionalFkFromUnknown(row.khu_vuc_id),
        vi_tri: row.vi_tri || null,
        hinh_thuc_giam_sat: hinh,
        cach_thuc_giam_sat: cach,
        nguoi_giam_sat_id: nguoiGsImport,
        nhan_vien_id: nhanVienImport,
        nghe_nghiep_id: optionalFkFromUnknown(row.nghe_nghiep_id),
        ngay_giam_sat: row.ngay_giam_sat || null,
        tong_diem: row.tong_diem ?? null,
        ghi_chu_chung: row.ghi_chu_chung || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      };
      if (sessionId && existingIds.has(sessionId)) {
        const { error: updateErr } = await supabase
          .from("fact_giam_sat_chung_sessions")
          .update(payload)
          .eq("id", sessionId);
        if (updateErr) throw updateErr;
      }
      else {
        const { error } = await supabase.from("fact_giam_sat_chung_sessions").insert(payload);
        if (error) throw error;
      }
    }
    // Import mặc định theo chế độ upsert, không tự động ẩn dữ liệu không có trong file.
    revalidatePath("/giam-sat-chung");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: formatUnknownError(error) };
  }
}
