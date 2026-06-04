"use server";

/**
 * @deprecated Bulk Excel (modal MasterDataImportExportModal). Luồng mới: `smart-import.actions.ts` trên từng trang DM.
 * Giữ cho pilot khoa / HC / TB / nhân sự đến khi gộp UI import.
 */
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "./verify-permission";
import { revalidateMasterDataRowCacheTag } from "@/lib/cache/revalidate-master-data-tags";

interface ActionResponse {
  success: boolean;
  inserted?: number;
  updated?: number;
  error?: string;
}

/**
 * Bulk Import Khoa Phong (Upsert based on ma_khoa).
 * Resolves Block ("Khối khoa") name into block UUID.
 */
export async function importBulkKhoaPhong(rows: any[]): Promise<ActionResponse> {
  try {
    await verifyPermission("DANH_MUC", "edit");
    const admin = createAdminSupabaseClient();

    if (!rows || rows.length === 0) {
      throw new Error("Mảng dữ liệu khoa phòng trống.");
    }

    // 1. Fetch block categories to map text name -> UUID
    const { data: blocks } = await admin
      .from("sys_lookup_value")
      .select("id, name")
      .eq("category_type", "KHOI_KHOA");

    const blockMap: Record<string, string> = {};
    if (blocks) {
      blocks.forEach((b) => {
        blockMap[String(b.name).toLowerCase().trim()] = b.id;
      });
    }

    // 2. Prepare and normalize rows
    const records = rows.map((row) => {
      const maKhoa = String(row.ma_khoa || "").toUpperCase().trim();
      const tenKhoa = String(row.ten_khoa || "").trim();
      
      if (!maKhoa || !tenKhoa) {
        throw new Error("Tệp chứa khoa phòng bị thiếu Mã khoa hoặc Tên khoa bắt buộc.");
      }

      const tenKhoi = String(row.ten_khoi || "").toLowerCase().trim();
      const blockId = blockMap[tenKhoi] ?? null;

      return {
        ma_khoa: maKhoa,
        ten_khoa: tenKhoa,
        khoi_id: blockId,
        mo_ta_chuc_nang: row.mo_ta_chuc_nang ? String(row.mo_ta_chuc_nang).trim() : null,
        so_bac_si: row.so_bac_si ? Math.max(0, parseInt(row.so_bac_si) || 0) : 0,
        so_dieu_duong: row.so_dieu_duong ? Math.max(0, parseInt(row.so_dieu_duong) || 0) : 0,
        so_giuong_benh_thuong: row.so_giuong_benh_thuong ? Math.max(0, parseInt(row.so_giuong_benh_thuong) || 0) : 0,
        so_giuong_cap_cuu: row.so_giuong_cap_cuu ? Math.max(0, parseInt(row.so_giuong_cap_cuu) || 0) : 0,
        is_active: true,
        updated_at: new Date().toISOString()
      };
    });

    // 3. Perform Batch Upsert
    const { error } = await admin
      .from("mdm_dm_khoa_phong")
      .upsert(records, { onConflict: "ma_khoa" });

    if (error) throw error;

    revalidateMasterDataRowCacheTag("mdm_dm_khoa_phong");
    return { success: true, inserted: records.length };
  } catch (err: any) {
    console.error("[Import Bulk KhoaPhong] Error:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Bulk Import Hoa Chat (Upsert based on ma_hoa_chat).
 */
export async function importBulkHoaChat(rows: any[]): Promise<ActionResponse> {
  try {
    await verifyPermission("DANH_MUC", "edit");
    const admin = createAdminSupabaseClient();

    if (!rows || rows.length === 0) {
      throw new Error("Mảng dữ liệu hóa chất trống.");
    }

    const records = rows.map((row) => {
      const maHoaChat = String(row.ma_hoa_chat || "").toUpperCase().trim();
      const tenHoaChat = String(row.ten_hoa_chat || "").trim();

      if (!maHoaChat || !tenHoaChat) {
        throw new Error("Tệp chứa hóa chất bị thiếu Mã hóa chất hoặc Tên hóa chất bắt buộc.");
      }

      return {
        ma_hoa_chat: maHoaChat,
        ten_hoa_chat: tenHoaChat,
        loai_hoa_chat: row.loai_hoa_chat ? String(row.loai_hoa_chat).trim() : "HOA_CHAT",
        don_vi_tinh: row.don_vi_tinh ? String(row.don_vi_tinh).trim() : null,
        han_su_dung: row.han_su_dung ? String(row.han_su_dung).trim() : null,
        nguong_ton_toi_thieu: row.nguong_ton_toi_thieu ? Math.max(0, parseFloat(row.nguong_ton_toi_thieu) || 0) : 0,
        is_active: true,
        updated_at: new Date().toISOString()
      };
    });

    const { error } = await admin
      .from("cssd_dm_hoa_chat")
      .upsert(records, { onConflict: "ma_hoa_chat" });

    if (error) throw error;

    revalidateMasterDataRowCacheTag("cssd_dm_hoa_chat");
    return { success: true, inserted: records.length };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Bulk Import Thiet Bi (Upsert based on ma_thiet_bi).
 * Resolves Sterilizer Type name into block UUID.
 */
export async function importBulkThietBi(rows: any[]): Promise<ActionResponse> {
  try {
    await verifyPermission("DANH_MUC", "edit");
    const admin = createAdminSupabaseClient();

    if (!rows || rows.length === 0) {
      throw new Error("Mảng dữ liệu thiết bị trống.");
    }

    // 1. Fetch sterilizer types to map text name -> UUID
    const { data: types } = await admin
      .from("sys_lookup_value")
      .select("id, name")
      .eq("category_type", "LOAI_MAY_TIET_KHUAN");

    const typeMap: Record<string, string> = {};
    if (types) {
      types.forEach((t) => {
        typeMap[String(t.name).toLowerCase().trim()] = t.id;
      });
    }

    // 2. Prepare records
    const records = rows.map((row) => {
      const maThietBi = String(row.ma_thiet_bi || "").toUpperCase().trim();
      const tenThietBi = String(row.ten_thiet_bi || "").trim();

      if (!maThietBi || !tenThietBi) {
        throw new Error("Tệp chứa thiết bị bị thiếu Mã thiết bị hoặc Tên thiết bị bắt buộc.");
      }

      const tenLoaiMay = String(row.ten_loai_may || "").toLowerCase().trim();
      const typeId = typeMap[tenLoaiMay] ?? null;

      return {
        ma_thiet_bi: maThietBi,
        ten_thiet_bi: tenThietBi,
        loai_may_id: typeId,
        ngay_dua_vao_su_dung: row.ngay_dua_vao_su_dung ? String(row.ngay_dua_vao_su_dung).trim() : null,
        chu_ky_bao_tri_ngay: row.chu_ky_bao_tri_ngay ? Math.max(1, parseInt(row.chu_ky_bao_tri_ngay) || 180) : 180,
        trang_thai: "READY",
        is_active: true,
        updated_at: new Date().toISOString()
      };
    });

    const { error } = await admin
      .from("cssd_dm_thiet_bi")
      .upsert(records, { onConflict: "ma_thiet_bi" });

    if (error) throw error;

    revalidateMasterDataRowCacheTag("cssd_dm_thiet_bi");
    return { success: true, inserted: records.length };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Bulk Import Nhan Su (Upsert based on ma_nv).
 * Safely maps ma_khoa, ma_to, ten_chuc_vu, ten_chuc_danh to UUIDs.
 */
export async function importBulkNhanSu(rows: any[]): Promise<ActionResponse> {
  try {
    await verifyPermission("NHAN_SU", "edit");
    const admin = createAdminSupabaseClient();

    if (!rows || rows.length === 0) {
      throw new Error("Mảng dữ liệu nhân sự trống.");
    }

    // 1. Fetch departments (mdm_dm_khoa_phong) to map ma_khoa -> UUID
    const { data: depts } = await admin
      .from("mdm_dm_khoa_phong")
      .select("id, ma_khoa");

    const deptMap: Record<string, string> = {};
    if (depts) {
      depts.forEach((d) => {
        deptMap[String(d.ma_khoa).toUpperCase().trim()] = d.id;
      });
    }

    // 2. Fetch lookup values for groups, positions, and titles
    const { data: lookups } = await admin
      .from("sys_lookup_value")
      .select("id, category_type, name");

    const groupMap: Record<string, string> = {};
    const positionMap: Record<string, string> = {};
    const titleMap: Record<string, string> = {};

    if (lookups) {
      lookups.forEach((l) => {
        const nameKey = String(l.name).toLowerCase().trim();
        if (l.category_type === "TO_CONG_TAC") {
          groupMap[nameKey] = l.id;
        } else if (l.category_type === "CHUC_VU") {
          positionMap[nameKey] = l.id;
        } else if (l.category_type === "CHUC_DANH") {
          titleMap[nameKey] = l.id;
        }
      });
    }

    // 3. Prepare records
    const records = rows.map((row) => {
      const maNv = String(row.ma_nv || "").toUpperCase().trim();
      const hoTen = String(row.ho_ten || "").trim();
      const maKhoa = String(row.ma_khoa || "").toUpperCase().trim();

      if (!maNv || !hoTen || !maKhoa) {
        throw new Error("Tệp chứa nhân sự bị thiếu Mã NV, Họ tên hoặc Mã khoa phòng bắt buộc.");
      }

      // Map UUIDs
      const khoaId = deptMap[maKhoa];
      if (!khoaId) {
        throw new Error(`Mã khoa phòng "${maKhoa}" không tồn tại trong hệ thống. Hãy cấu hình Khoa phòng trước.`);
      }

      const maTo = String(row.ma_to || "").toLowerCase().trim();
      const toId = groupMap[maTo] ?? null;

      const tenChucVu = String(row.ten_chuc_vu || "").toLowerCase().trim();
      const chucVuId = positionMap[tenChucVu] ?? null;

      const tenChucDanh = String(row.ten_chuc_danh || "").toLowerCase().trim();
      const chucDanhId = titleMap[tenChucDanh] ?? null;

      return {
        ma_nv: maNv,
        ho_ten: hoTen,
        email: row.email ? String(row.email).toLowerCase().trim() : null,
        so_dien_thoai: row.so_dien_thoai ? String(row.so_dien_thoai).trim() : null,
        gioi_tinh: row.gioi_tinh ? String(row.gioi_tinh).trim() : null,
        ngay_sinh: row.ngay_sinh ? String(row.ngay_sinh).trim() : null,
        khoa_id: khoaId,
        to_id: toId,
        chuc_vu_id: chucVuId,
        chuc_danh_id: chucDanhId,
        is_active: true,
        updated_at: new Date().toISOString()
      };
    });

    // 4. Perform Batch Upsert
    const { error } = await admin
      .from("mdm_nhan_su")
      .upsert(records, { onConflict: "ma_nv" });

    if (error) throw error;

    revalidateMasterDataRowCacheTag("mdm_nhan_su");
    return { success: true, inserted: records.length };
  } catch (err: any) {
    console.error("[Import Bulk NhanSu] Error:", err.message);
    return { success: false, error: err.message };
  }
}
