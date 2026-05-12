"use server";

import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { mapDanhMucOptions, mapKhoaOptions } from "@/lib/master-data/gateway";
import { verifyPermission } from "@/lib/server-permission";
import { enrichHoSoForSupervisionUi } from "@/lib/master-data/nhan-su-enrich";

type LoadOptions = {
  includeNhanSu?: boolean;
  includeNgheNghiep?: boolean;
  includeHistoryLocations?: boolean;
  /**
   * admin: DANH_MUC (màn quản trị / công việc…).
   * vst / gsc / nkbv: GIAM_SAT_VST | GIAM_SAT_CHUNG | GIAM_SAT_NKBV — dùng khi tải khoa cho module giám sát.
   */
  permissionContext?: "admin" | "vst" | "gsc" | "nkbv";
};
type LocationRow = { vi_tri_cu_the?: string | null };
type DmOptionRow = {
  id?: string;
  is_active?: boolean;
  ma_khu_vuc?: string;
  ten_khu_vuc?: string;
  ma_nghe_nghiep?: string;
  ten_nghe_nghiep?: string;
};

import { unstable_cache } from "next/cache";

export async function getSupervisionMasterDataBundle(options: LoadOptions = {}) {
  const ctx = options.permissionContext ?? "admin";
  const includeNhanSu = options.includeNhanSu === true; // Default false for header performance
  const includeNgheNghiep = options.includeNgheNghiep !== false;
  const includeHistory = options.includeHistoryLocations !== false;

  try {
    if (ctx === "admin") {
      await verifyPermission("DANH_MUC", "view");
    } else {
      const supervisionMod =
        ctx === "vst" ? "GIAM_SAT_VST" : ctx === "nkbv" ? "GIAM_SAT_NKBV" : "GIAM_SAT_CHUNG";
      await verifyPermission(supervisionMod, "view");
    }

    const supabase = createAdminSupabaseClient();

    const getCachedRegistries = unstable_cache(
      async () => {
        const { data, error } = await supabase.rpc("rpc_get_registry_options", {
          p_categories: ["KHOA_PHONG", "KHU_VUC_GIAM_SAT", includeNgheNghiep ? "NGHE_NGHIEP" : null].filter(Boolean) as string[],
        });
        if (error) throw error;
        return data as any;
      },
      [`master-registries-${ctx}-${includeNgheNghiep}`],
      { revalidate: 600, tags: ["registries"] }
    );

    const [registry, nhanSuRes, locationRes, khuVucFallbackRes] = await Promise.all([
      getCachedRegistries(),
      includeNhanSu
        ? supabase
            .from("v_mdm_nhan_su_full")
            .select("*")
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(1000)
        : Promise.resolve({ data: [], error: null }),
      includeHistory
        ? supabase
            .from("fact_giam_sat_vst_sessions")
            .select("vi_tri_cu_the")
            .eq("is_active", true)
            .not("vi_tri_cu_the", "is", null)
            .order("created_at", { ascending: false })
            .limit(5000)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("dm_khu_vuc_giam_sat")
        .select("id, ma_khu_vuc, ten_khu_vuc")
        .eq("is_active", true)
        .order("ten_khu_vuc"),
    ]);

    if (nhanSuRes.error) throw nhanSuRes.error;
    if (locationRes.error) throw locationRes.error;
    if (khuVucFallbackRes.error) throw khuVucFallbackRes.error;

    const historyLocations = Array.from(
      new Set(
        (locationRes.data as LocationRow[] || []).map((d) => String(d.vi_tri_cu_the || "")).filter(Boolean)
      )
    );

    const rawNhanSuRows = ((nhanSuRes.data || []) as Record<string, unknown>[]) || [];
    const nhanSusEnriched = rawNhanSuRows.map(x => ({
      ...x,
      chuc_danh: x.ten_chuc_danh || x.chuc_danh,
      chuc_vu: x.ten_chuc_vu || x.chuc_vu,
      vai_tro_he_thong_ksnk: x.ten_vai_tro || x.vai_tro_he_thong_ksnk,
      ten_nghe_nghiep_dm: x.ten_nghe_nghiep,
    }));

    let currentHoSoId: string | null = null;
    try {
      const userSb = await createServerSupabaseUserClient();
      const { data: { user } } = await userSb.auth.getUser();
      if (user?.id) {
        const { data: hs } = await userSb
          .from("mdm_nhan_su")
          .select("id")
          .or(`auth_user_id.eq.${user.id},id.eq.${user.id}`)
          .eq("is_active", true)
          .maybeSingle();
        currentHoSoId = (hs as { id?: string } | null)?.id ?? null;
      }
    } catch { /* Ignore */ }

    const rpcKhuVucs = Array.isArray(registry?.KHU_VUC_GIAM_SAT) ? registry.KHU_VUC_GIAM_SAT : [];
    const fallbackKhuVucs = (khuVucFallbackRes.data || []).map((x) => ({
      id: String(x.id || ""),
      ma: String(x.ma_khu_vuc || ""),
      ten: String(x.ten_khu_vuc || ""),
    }));
    const effectiveKhuVucs = rpcKhuVucs.length > 0 ? rpcKhuVucs : fallbackKhuVucs;

    return {
      success: true as const,
      data: {
        currentHoSoId,
        khoas: (registry.KHOA_PHONG || []).map((k: any) => ({ id: k.id, ma_danh_muc: k.ma, ten_danh_muc: k.ten })),
        khuVucs: effectiveKhuVucs.map((x: any) => ({ id: x.id, ma_danh_muc: x.ma, ten_danh_muc: x.ten })),
        ngheNghieps: (registry.NGHE_NGHIEP || []).map((x: any) => ({ id: x.id, ma_danh_muc: x.ma, ten_danh_muc: x.ten })),
        nhanSus: nhanSusEnriched,
        historyLocations,
      },
    };
  } catch (error: unknown) {
    console.error("getSupervisionMasterDataBundle failed:", error);
    return { success: false as const, error: "Lỗi tải danh mục." };
  }
}
