"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { verifyPermission } from "@/lib/server-permission";
import { normalizeAndValidateDmKhoaPhong } from "@/lib/master-data/validation";
import { normalizeHoSoNhanVienOptionalOrThrow } from "@/lib/master-data/fk-normalize";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import { giamSatNkbvCaSchema } from "@/lib/validations";
import crypto from "crypto";
import {
  evaluateBsiClabsi,
  evaluateVaeVap,
  evaluateUtiCauti,
  evaluateSsi
} from "../lib/nkbv-rules-engine";

type Payload = Record<string, unknown>;

function clean(payload: Payload): Payload {
  const o = { ...payload };
  Object.keys(o).forEach((k) => {
    if (o[k] === "") o[k] = null;
  });
  return o;
}

async function validateLoaiTrangAndLyDo(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  loai_nkbv_id: string,
  trang_thai_id: string,
  ly_do_loai_tru: unknown,
) {
  const { data: tt, error: et } = await supabase
    .from("dm_trang_thai_nkbv_ca")
    .select("id, ma_trang_thai")
    .eq("id", trang_thai_id)
    .eq("is_active", true)
    .maybeSingle();
  if (et) throw new Error(et.message);
  if (!tt?.id) throw new Error("Trạng thái phiếu không hợp lệ.");

  const { data: lo, error: el } = await supabase
    .from("dm_loai_nkbv")
    .select("id")
    .eq("id", loai_nkbv_id)
    .eq("is_active", true)
    .maybeSingle();
  if (el) throw new Error(el.message);
  if (!lo) throw new Error("Loại NKBV không hợp lệ.");

  const ttMa = String((tt as { ma_trang_thai?: string }).ma_trang_thai || "");
  if (ttMa === "LOAI_TRU" && !String(ly_do_loai_tru ?? "").trim()) {
    throw new Error("Trạng thái Loại trừ: vui lòng nhập lý do loại trừ.");
  }
}

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

    // 1. Ensure stay exists in fact_nkbv_benh_an first
    const cleanMaBenhAn = String(raw.ma_benh_an || `BA-TEMP-${raw.ma_benh_nhan || 'UNKNOWN'}`).trim();
    const { data: existingStay } = await supabase
      .from("fact_nkbv_benh_an")
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
        .from("fact_nkbv_benh_an")
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
      verification_data: raw.verification_data ?? {},
      loai_nkbv_id: String(raw.loai_nkbv_id),
      trang_thai_id: String(raw.trang_thai_id),
      nguoi_ghi_id: raw.nguoi_ghi_id ?? null,
      ma_benh_an: cleanMaBenhAn,
      ma_benh_pham: raw.ma_benh_pham ?? null,
      loai_benh_pham: raw.loai_benh_pham ?? null,
      so_luong: raw.so_luong ?? null,
      is_active: true,
    };

    const { data, error } = await supabase.from("fact_nkbv_su_kien").insert(insertRow).select().single();
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

    const { data, error } = await supabase.from("fact_nkbv_su_kien").update(patch).eq("id", id).select().single();
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
    .from("fact_nkbv_su_kien")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };
  revalidatePath("/giam-sat-nkbv");
  return { success: true as const };
}

interface ViSinhRecordInput {
  ma_benh_nhan: string;
  ma_benh_an: string;
  ma_benh_pham: string;
  ho_ten_benh_nhan: string;
  ngay_sinh?: string;
  gioi_tinh?: string;
  ngay_vao_vien: string;
  ngay_lay_mau: string;
  khoa_yeu_cau_id?: string;
  loai_benh_pham: string;
  tac_nhan: string;
  so_luong?: string;
}

/** Nạp kết quả cấy vi sinh dương tính LIS từ Excel. */
export async function importViSinhExcel(records: ViSinhRecordInput[]) {
  await verifyPermission("GIAM_SAT_NKBV", "create");
  const supabase = createAdminSupabaseClient();
  
  try {
    // 1. Ensure unique stayed medical records exist in fact_nkbv_benh_an
    const uniqueStays = Array.from(
      new Map(
        records.map((r) => [
          r.ma_benh_an,
          {
            ma_benh_an: r.ma_benh_an,
            ma_benh_nhan: r.ma_benh_nhan,
            ho_ten_benh_nhan: r.ho_ten_benh_nhan,
            ngay_sinh: r.ngay_sinh ? r.ngay_sinh.slice(0, 10) : null,
            gioi_tinh: r.gioi_tinh ?? null,
            ngay_vao_vien: r.ngay_vao_vien ? new Date(r.ngay_vao_vien).toISOString() : new Date().toISOString(),
            khoa_dieu_tri_id: r.khoa_yeu_cau_id || null,
            is_active: true,
          },
        ])
      ).values()
    );

    for (const stay of uniqueStays) {
      const { data: existingStay } = await supabase
        .from("fact_nkbv_benh_an")
        .select("id")
        .eq("ma_benh_an", stay.ma_benh_an)
        .eq("is_active", true)
        .maybeSingle();

      if (!existingStay) {
        const { error: stayErr } = await supabase
          .from("fact_nkbv_benh_an")
          .insert(stay);
        if (stayErr) throw stayErr;
      }
    }

    // 2. Prepare raw LIS records to insert
    const recordsToInsert = records.map((r) => {
      const unique_key = crypto
        .createHash("md5")
        .update(`${r.ma_benh_nhan}_${r.ma_benh_an}_${r.ma_benh_pham}_${r.tac_nhan}`)
        .digest("hex");
      
      return {
        ma_benh_nhan: r.ma_benh_nhan,
        ma_benh_an: r.ma_benh_an,
        ma_benh_pham: r.ma_benh_pham,
        ho_ten_benh_nhan: r.ho_ten_benh_nhan,
        ngay_sinh: r.ngay_sinh ? r.ngay_sinh.slice(0, 10) : null,
        gioi_tinh: r.gioi_tinh ?? null,
        ngay_vao_vien: new Date(r.ngay_vao_vien).toISOString(),
        ngay_lay_mau: new Date(r.ngay_lay_mau).toISOString(),
        khoa_yeu_cau_id: r.khoa_yeu_cau_id || null,
        loai_benh_pham: r.loai_benh_pham,
        tac_nhan: r.tac_nhan,
        so_luong: r.so_luong ?? null,
        ket_qua_duong_tinh: true,
        is_active: true,
        metadata: { unique_key }
      };
    });

    if (recordsToInsert.length === 0) {
      return { success: true as const, count: 0, createdCasesCount: 0 };
    }

    const { data: existingRecords, error: fetchErr } = await supabase
      .from("fact_nkbv_vi_sinh")
      .select("metadata")
      .eq("is_active", true);
    
    if (fetchErr) throw fetchErr;

    const existingKeysSet = new Set(
      (existingRecords || [])
        .map((r: any) => r.metadata?.unique_key)
        .filter(Boolean)
    );

    const filteredRecords = recordsToInsert.filter(r => !existingKeysSet.has(r.metadata.unique_key));

    if (filteredRecords.length === 0) {
      return { success: true as const, count: 0, createdCasesCount: 0 };
    }

    const { data: insertedRecords, error: insertErr } = await supabase
      .from("fact_nkbv_vi_sinh")
      .insert(filteredRecords)
      .select();

    if (insertErr) throw insertErr;

    // Fetch active NKBV categories and statuses
    const { data: categories } = await supabase
      .from("dm_loai_nkbv")
      .select("id, ma_loai, ten_loai")
      .eq("is_active", true);

    const { data: statusRow } = await supabase
      .from("dm_trang_thai_nkbv_ca")
      .select("id")
      .eq("ma_trang_thai", "DANG_GHI_NHAN")
      .eq("is_active", true)
      .maybeSingle();

    let defaultStatusId = statusRow?.id;
    if (!defaultStatusId) {
      const { data: altStatus } = await supabase
        .from("dm_trang_thai_nkbv_ca")
        .select("id")
        .eq("ma_trang_thai", "CHO_XAC_NHAN")
        .eq("is_active", true)
        .maybeSingle();
      defaultStatusId = altStatus?.id;
    }
    if (!defaultStatusId) {
      const { data: firstStatus } = await supabase
        .from("dm_trang_thai_nkbv_ca")
        .select("id")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      defaultStatusId = firstStatus?.id;
    }

    const getLoaiNkbvId = (loaiBenhPham: string) => {
      const lower = (loaiBenhPham || "").toLowerCase();
      let code = "BSI";
      if (lower.includes("tiểu") || lower.includes("urine")) {
        code = "UTI";
      } else if (
        lower.includes("đờm") ||
        lower.includes("phế quản") ||
        lower.includes("phế nang") ||
        lower.includes("phổi") ||
        lower.includes("hút") ||
        lower.includes("sputum") ||
        lower.includes("bronchial")
      ) {
        code = "VAE";
      } else if (
        lower.includes("mủ") ||
        lower.includes("vết mổ") ||
        lower.includes("vết thương") ||
        lower.includes("dịch vết mổ") ||
        lower.includes("surgical") ||
        lower.includes("wound") ||
        lower.includes("pus")
      ) {
        code = "SSI";
      } else if (lower.includes("máu") || lower.includes("blood")) {
        code = "BSI";
      }

      const matched = categories?.find(c => c.ma_loai === code || c.ma_loai?.toUpperCase() === code);
      return matched?.id || categories?.[0]?.id;
    };

    // Query active events for the stayed records in these imports for RIT 14-day check
    const importedStayIds = Array.from(new Set(insertedRecords.map((r) => r.ma_benh_an).filter(Boolean)));
    const { data: existingEvents } = await supabase
      .from("fact_nkbv_su_kien")
      .select("id, ma_benh_an, ngay_phat_hien, tac_nhan_vi_khuan, clinical_notes")
      .in("ma_benh_an", importedStayIds)
      .eq("is_active", true);

    const casesToInsert: any[] = [];
    const eventsToUpdate: { id: string; patch: any }[] = [];

    // 3. Construct case events or update them for each newly inserted record
    for (const r of (insertedRecords || [])) {
      const cleanMaBenhAn = r.ma_benh_an || `BA-TEMP-${r.ma_benh_nhan || r.id}`;
      const rDateStr = r.ngay_lay_mau ? r.ngay_lay_mau.slice(0, 10) : "";

      const ritMatchedEvent = (existingEvents || []).find((e) => {
        if (e.ma_benh_an !== cleanMaBenhAn) return false;
        const doeStr = e.ngay_phat_hien ? String(e.ngay_phat_hien).slice(0, 10) : "";
        if (!doeStr || !rDateStr) return false;

        const rTime = new Date(rDateStr).getTime();
        const doeTime = new Date(doeStr).getTime();
        const diffDays = (rTime - doeTime) / (1000 * 60 * 60 * 24);
        // RIT 14-day window: [0, 13] days from DOE
        return diffDays >= 0 && diffDays <= 13;
      });

      if (ritMatchedEvent) {
        // RIT Gộp mẫu: don't create a new event, update existing event
        const oldPathogens = String(ritMatchedEvent.tac_nhan_vi_khuan || "").split(",").map(p => p.trim()).filter(Boolean);
        const newPathogen = String(r.tac_nhan || "").trim();
        if (newPathogen && !oldPathogens.includes(newPathogen)) {
          oldPathogens.push(newPathogen);
        }
        const updatedPathogens = oldPathogens.join(", ");

        const oldNotes = (ritMatchedEvent.clinical_notes && typeof ritMatchedEvent.clinical_notes === "object") 
          ? ritMatchedEvent.clinical_notes 
          : {};
        const oldHistory = (oldNotes as any).tom_tat_dien_bien || "";
        const mergeLog = `\n[RIT Gộp mẫu] LIS cấy mẫu ${r.loai_benh_pham} (${r.so_luong || "không định lượng"}) phát hiện ${r.tac_nhan} vào ngày ${new Date(r.ngay_lay_mau).toLocaleDateString("vi-VN")}. Tự động gộp vào sự kiện chẩn đoán trước đó.`;

        eventsToUpdate.push({
          id: ritMatchedEvent.id,
          patch: {
            tac_nhan_vi_khuan: updatedPathogens,
            clinical_notes: {
              ...oldNotes,
              tom_tat_dien_bien: oldHistory + mergeLog,
            },
            updated_at: new Date().toISOString(),
          }
        });
      } else {
        const cleanMaBenhPham = r.ma_benh_pham || `BP-TEMP-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
        const maCa = `NK-${cleanMaBenhAn}-${cleanMaBenhPham}`;

        let viTri = "BSI";
        const lower = (r.loai_benh_pham || "").toLowerCase();
        if (lower.includes("tiểu") || lower.includes("urine")) {
          viTri = "Đường tiết niệu";
        } else if (
          lower.includes("đờm") ||
          lower.includes("phế quản") ||
          lower.includes("phế nang") ||
          lower.includes("phổi") ||
          lower.includes("hút") ||
          lower.includes("sputum") ||
          lower.includes("bronchial")
        ) {
          viTri = "Đường hô hấp";
        } else if (
          lower.includes("mủ") ||
          lower.includes("vết mổ") ||
          lower.includes("vết thương") ||
          lower.includes("dịch vết mổ") ||
          lower.includes("surgical") ||
          lower.includes("wound") ||
          lower.includes("pus")
        ) {
          viTri = "Vết mổ";
        } else {
          viTri = "Máu";
        }

        casesToInsert.push({
          ma_ca: maCa,
          khoa_ghi_nhan_id: r.khoa_yeu_cau_id || null,
          ma_benh_nhan: r.ma_benh_nhan,
          ho_ten_benh_nhan: r.ho_ten_benh_nhan,
          ngay_sinh: r.ngay_sinh,
          gioi_tinh: r.gioi_tinh,
          ngay_vao_vien: r.ngay_vao_vien,
          ngay_phat_hien: r.ngay_lay_mau ? r.ngay_lay_mau.slice(0, 10) : new Date().toISOString().slice(0, 10),
          vi_tri_nhiem_khuan: viTri,
          tac_nhan_vi_khuan: r.tac_nhan,
          clinical_notes: {
            tom_tat_dien_bien: `Tự động tạo sự kiện giám sát từ kết quả vi sinh dương tính: cấy phát hiện ${r.tac_nhan} trong mẫu ${r.loai_benh_pham}.`,
            bien_phap_phong_ngua: null,
            ly_do_loai_tru: null,
          },
          vi_sinh_record_id: r.id,
          verification_data: {},
          loai_nkbv_id: getLoaiNkbvId(r.loai_benh_pham),
          trang_thai_id: defaultStatusId,
          nguoi_ghi_id: null,
          ma_benh_an: cleanMaBenhAn,
          ma_benh_pham: cleanMaBenhPham,
          loai_benh_pham: r.loai_benh_pham,
          so_luong: r.so_luong,
          is_active: true,
        });
      }
    }

    // Execute updates
    for (const update of eventsToUpdate) {
      const { error: updErr } = await supabase
        .from("fact_nkbv_su_kien")
        .update(update.patch)
        .eq("id", update.id);
      if (updErr) throw updErr;
    }

    // Execute inserts
    if (casesToInsert.length > 0) {
      const { error: casesErr } = await supabase
        .from("fact_nkbv_su_kien")
        .insert(casesToInsert);
      if (casesErr) {
        throw new Error("Lỗi tự động tạo sự kiện giám sát từ vi sinh LIS: " + casesErr.message);
      }
    }

    revalidatePath("/giam-sat-nkbv");
    return {
      success: true as const,
      count: filteredRecords.length,
      createdCasesCount: casesToInsert.length
    };
  } catch (e: any) {
    return { success: false as const, error: e.message || "Lỗi xử lý Excel" };
  }
}

/** Lâm sàng điền checklist triệu chứng và chạy Rules Engine CDC tự động đề xuất chẩn đoán. */
export async function submitClinicalVerification(id: string, viTriNhiemKhuan: string, verificationInput: any) {
  await verifyPermission("GIAM_SAT_NKBV", "edit");
  const supabase = createAdminSupabaseClient();

  try {
    if (viTriNhiemKhuan === "LOAI_TRU") {
      const excludeStatus = await supabase
        .from("dm_trang_thai_nkbv_ca")
        .select("id")
        .eq("ma_trang_thai", "LOAI_TRU")
        .eq("is_active", true)
        .maybeSingle()
        .then((r) => r.data);

      const notes = verificationInput.clinical_notes || {};
      const updatedNotes = {
        ...notes,
        ly_do_loai_tru: "Bác sĩ phán quyết loại trừ ca bệnh.",
      };

      const { data, error: updateErr } = await supabase
        .from("fact_nkbv_su_kien")
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

    let result;
    if (viTriNhiemKhuan === "BSI") {
      result = evaluateBsiClabsi(verificationInput);
    } else if (viTriNhiemKhuan === "VAP" || viTriNhiemKhuan === "VAE") {
      result = evaluateVaeVap(verificationInput);
    } else if (viTriNhiemKhuan === "UTI") {
      result = evaluateUtiCauti(verificationInput);
    } else if (viTriNhiemKhuan === "SSI") {
      result = evaluateSsi(verificationInput);
    } else {
      throw new Error(`Vị trí nhiễm khuẩn không hợp lệ: ${viTriNhiemKhuan}`);
    }

    // Map code to Vietnamese label and category code
    let mappedViTri = "";
    let loaiCode = "";
    if (viTriNhiemKhuan === "BSI") {
      mappedViTri = "Máu";
      loaiCode = "BSI";
    } else if (viTriNhiemKhuan === "VAP" || viTriNhiemKhuan === "VAE") {
      mappedViTri = "Đường hô hấp";
      loaiCode = "VAP";
    } else if (viTriNhiemKhuan === "UTI") {
      mappedViTri = "Đường tiết niệu";
      loaiCode = "UTI";
    } else if (viTriNhiemKhuan === "SSI") {
      mappedViTri = "Vết mổ";
      loaiCode = "SSI";
    }

    // Query loai_nkbv_id based on loaiCode
    let loaiNkbvId = undefined;
    if (loaiCode) {
      const { data: matchedLoai } = await supabase
        .from("dm_loai_nkbv")
        .select("id")
        .or(`ma_loai.ilike.%${loaiCode}%,ma_loai.ilike.%${viTriNhiemKhuan}%`)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      
      if (matchedLoai) {
        loaiNkbvId = matchedLoai.id;
      }
    }

    let lookupStatus = await supabase
      .from("dm_trang_thai_nkbv_ca")
      .select("id")
      .eq("ma_trang_thai", "CHO_DUYET")
      .eq("is_active", true)
      .maybeSingle()
      .then((r) => r.data);

    if (!lookupStatus) {
      lookupStatus = await supabase
        .from("dm_trang_thai_nkbv_ca")
        .select("id")
        .eq("ma_trang_thai", "CHO_XAC_NHAN")
        .eq("is_active", true)
        .maybeSingle()
        .then((r) => r.data);
    }

    const verification_data = {
      ...verificationInput,
      evaluation_result: result,
      classification: result.classification,
      is_positive: result.is_positive,
      is_secondary_bsi: result.is_secondary_bsi || false,
      reason: result.reason,
    };

    const { data, error: updateErr } = await supabase
      .from("fact_nkbv_su_kien")
      .update({
        verification_data,
        trang_thai_id: lookupStatus!.id,
        vi_tri_nhiem_khuan: mappedViTri || undefined,
        ...(loaiNkbvId && { loai_nkbv_id: loaiNkbvId }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    revalidatePath("/giam-sat-nkbv");
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
      .from("dm_trang_thai_nkbv_ca")
      .select("id")
      .eq("ma_trang_thai", statusCode)
      .eq("is_active", true)
      .maybeSingle();
    if (lErr) throw lErr;
    if (!lookupStatus) throw new Error(`Không tìm thấy trạng thái ${statusCode}.`);

    const { data: ca, error: fetchErr } = await supabase
      .from("fact_nkbv_su_kien")
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
      .from("fact_nkbv_su_kien")
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
