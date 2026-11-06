/**
 * Master Data Cache Layer
 *
 * Dùng `unstable_cache` — callback **có thể** chạy ngoài ngữ cảnh request có cookie,
 * nên giữ `createAdminSupabaseClient` cho lớp cache (danh mục tĩnh, không chứa PII nhạy).
 * TTL 15 phút. Route gọi cache vẫn phải gate quyền ở Server Action.
 */

import { unstable_cache } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase-server";

export const getCachedDmKhoaPhong = unstable_cache(
  async () => {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("mdm_dm_khoa_phong")
      .select("id, ma_khoa, ten_khoa, khoi_id")
      .eq("is_active", true)
      .order("ten_khoa");

    if (error) throw error;
    return data || [];
  },
  ["mdm_dm_khoa_phong"],
  { revalidate: 900, tags: ["mdm_dm_khoa_phong"] },
);

/**
 * Toàn bộ `mdm_dm_khoa_phong` (kể cả `is_active = false`) — dùng để nối `ten → id → khoi_id`
 * khi payload RPC cũ chưa kèm `id` trên `by_khoa`. Cache 15' + tag `mdm_dm_khoa_phong_all`.
 */
export const getCachedDmKhoaPhongAll = unstable_cache(
  async () => {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("mdm_dm_khoa_phong")
      .select("id, ten_khoa, khoi_id");

    if (error) throw error;
    return (data ?? []) as Array<{ id: string; ten_khoa: string | null; khoi_id: string | null }>;
  },
  ["mdm_dm_khoa_phong_all"],
  { revalidate: 900, tags: ["mdm_dm_khoa_phong", "mdm_dm_khoa_phong_all"] },
);

export const getCachedDmNgheNghiep = unstable_cache(
  async () => {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("mdm_dm_nghe_nghiep")
      .select("id, ten_nghe_nghiep")
      .eq("is_active", true)
      .order("ten_nghe_nghiep");

    if (error) throw error;
    return data || [];
  },
  ["mdm_dm_nghe_nghiep"],
  { revalidate: 900, tags: ["mdm_dm_nghe_nghiep"] },
);

export const getCachedDmKhuVucGiamSat = unstable_cache(
  async () => {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("gstt_dm_khu_vuc_giam_sat")
      .select("id, ten_khu_vuc")
      .eq("is_active", true)
      .order("ten_khu_vuc");

    if (error) throw error;
    return data || [];
  },
  ["gstt_dm_khu_vuc_giam_sat"],
  { revalidate: 900, tags: ["gstt_dm_khu_vuc_giam_sat"] },
);

export const getCachedDmKhoiKhoa = unstable_cache(
  async () => {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("mdm_dm_khoi_khoa")
      .select("id, ma_khoi, ten_khoi")
      .eq("is_active", true)
      .order("ten_khoi");

    if (error) throw error;
    return data || [];
  },
  ["mdm_dm_khoi_khoa"],
  { revalidate: 900, tags: ["mdm_dm_khoi_khoa"] },
);
