"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { verifyPermission } from "@/lib/server-permission";
import crypto from "crypto";

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
    // 1. Ensure unique stayed medical records exist in nkbv_fact_benh_an
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
        .from("nkbv_fact_benh_an")
        .select("id")
        .eq("ma_benh_an", stay.ma_benh_an)
        .eq("is_active", true)
        .maybeSingle();

      if (!existingStay) {
        const { error: stayErr } = await supabase
          .from("nkbv_fact_benh_an")
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
      .from("nkbv_fact_vi_sinh")
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
      .from("nkbv_fact_vi_sinh")
      .insert(filteredRecords)
      .select();

    if (insertErr) throw insertErr;

    // Fetch active NKBV categories and statuses
    const { data: categories } = await supabase
      .from("nkbv_dm_loai")
      .select("id, ma_loai, ten_loai")
      .eq("is_active", true);

    const { data: statusRow } = await supabase
      .from("nkbv_dm_trang_thai_ca")
      .select("id")
      .eq("ma_trang_thai", "DANG_GHI_NHAN")
      .eq("is_active", true)
      .maybeSingle();

    let defaultStatusId = statusRow?.id;
    if (!defaultStatusId) {
      const { data: altStatus } = await supabase
        .from("nkbv_dm_trang_thai_ca")
        .select("id")
        .eq("ma_trang_thai", "CHO_XAC_NHAN")
        .eq("is_active", true)
        .maybeSingle();
      defaultStatusId = altStatus?.id;
    }
    if (!defaultStatusId) {
      const { data: firstStatus } = await supabase
        .from("nkbv_dm_trang_thai_ca")
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
      .from("nkbv_fact_su_kien")
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
        .from("nkbv_fact_su_kien")
        .update(update.patch)
        .eq("id", update.id);
      if (updErr) throw updErr;
    }

    // Execute inserts
    if (casesToInsert.length > 0) {
      const { error: casesErr } = await supabase
        .from("nkbv_fact_su_kien")
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
