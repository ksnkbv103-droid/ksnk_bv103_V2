"use server";

import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { getRegistryEntryOrNull } from "./domain-registry";
import { fetchActiveRegistryDmRows, RegistrySelectRow } from "./registry-select-fetch";
import {
  getCachedDmKhoaPhong,
  getCachedDmNgheNghiep,
  getCachedDmKhuVucGiamSat,
  getCachedDmKhoiKhoa,
} from "@/lib/cache/master-data-cache";

/**
 * Server Action lấy dữ liệu danh mục tĩnh dùng chung.
 * Tích hợp sẵn Caching cho các bảng danh mục lớn đã được cache.
 */
export async function getActiveMasterDataAction(loaiDanhMuc: string): Promise<RegistrySelectRow[]> {
  try {
    const loai = loaiDanhMuc.trim().toUpperCase();

    // 1. Kiểm tra cache trước cho các danh mục lớn/tần suất truy vấn cao
    if (loai === "KHOA_PHONG") {
      const data = await getCachedDmKhoaPhong();
      return data.map((r) => ({ id: r.id, ma: r.ma_khoa, ten: r.ten_khoa }));
    }
    if (loai === "NGHE_NGHIEP") {
      const data = await getCachedDmNgheNghiep();
      return data.map((r) => ({ id: r.id, ma: "", ten: r.ten_nghe_nghiep }));
    }
    if (loai === "KHU_VUC_GIAM_SAT") {
      const data = await getCachedDmKhuVucGiamSat();
      return data.map((r) => ({ id: r.id, ma: "", ten: r.ten_khu_vuc }));
    }
    if (loai === "KHOI_KHOA") {
      const data = await getCachedDmKhoiKhoa();
      return data.map((r) => ({ id: r.id, ma: r.ma_khoi, ten: r.ten_khoi }));
    }

    // 2. Với các danh mục khác, check xem có đăng ký trong Registry không
    const reg = getRegistryEntryOrNull(loai);
    if (!reg) {
      throw new Error(`Loại danh mục chưa được khai báo: ${loai}`);
    }

    // 3. Tạo supabase client (an toàn theo phiên đăng nhập của User, tuân thủ RLS)
    const supabase = await createServerSupabaseUserClient();

    // 4. Fetch dữ liệu từ DB
    const data = await fetchActiveRegistryDmRows(supabase, loai);
    return data;
  } catch (error: any) {
    console.error("Error at getActiveMasterDataAction:", { loaiDanhMuc, error: error.message });
    throw new Error(error.message || "Không thể tải dữ liệu danh mục");
  }
}
