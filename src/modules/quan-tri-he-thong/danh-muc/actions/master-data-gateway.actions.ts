"use server";

import { mapNhanSuViewRow } from "@/lib/nhan-su-view-row";
import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";

type LoadOptions = {
  includeNhanSu?: boolean;
  includeNgheNghiep?: boolean;
  /**
   * Gợi ý vị trí từ `gstt_fact_vst_sessions` — mặc định **tắt** (dữ liệu import cũ hay sai);
   * chỉ bật khi truyền `true` (tính năng có thể bật lại sau khi có nguồn sạch).
   */
  includeHistoryLocations?: boolean;
  /**
   * admin: DANH_MUC (màn quản trị / công việc…).
   * vst / gsc / nkbv: GIAM_SAT_VST | GIAM_SAT_CHUNG | GIAM_SAT_NKBV — dùng khi tải khoa cho module giám sát.
   */
  permissionContext?: "admin" | "vst" | "gsc" | "nkbv";
};

/** Một dòng gợi ý vị trí (khoa + chuỗi) — chỉ dùng khi `includeHistoryLocations: true`. */
export type VstSessionLocationHistoryRow = { khoa_id: string | null; vi_tri_cu_the: string };

type LocationRow = { vi_tri_cu_the?: string | null; khoa_id?: string | null };

import { unstable_cache } from "next/cache";

export async function getSupervisionMasterDataBundle(options: LoadOptions = {}) {
  const ctx = options.permissionContext ?? "admin";
  const includeNhanSu = options.includeNhanSu === true; // Default false for header performance
  const includeNgheNghiep = options.includeNgheNghiep !== false;
  const includeHistory = options.includeHistoryLocations === true;

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
          p_categories: [
            "KHOA_PHONG",
            "KHU_VUC_GIAM_SAT",
            "HINH_THUC_GIAM_SAT",
            "CACH_THUC_GIAM_SAT",
            includeNgheNghiep ? "NGHE_NGHIEP" : null,
          ].filter(Boolean) as string[],
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
            .from("gstt_fact_vst_sessions")
            .select("vi_tri_cu_the, khoa_id")
            .eq("is_active", true)
            .not("vi_tri_cu_the", "is", null)
            .order("created_at", { ascending: false })
            .limit(5000)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("gstt_dm_khu_vuc_giam_sat")
        .select("id, ma_khu_vuc, ten_khu_vuc, nhom_mau, thu_tu")
        .eq("is_active", true)
        .order("thu_tu"),
    ]);

    if (nhanSuRes.error) throw nhanSuRes.error;
    if (locationRes.error) throw locationRes.error;
    if (khuVucFallbackRes.error) throw khuVucFallbackRes.error;

    const historyLocationRows: VstSessionLocationHistoryRow[] = [];
    const seenPair = new Set<string>();
    for (const d of (locationRes.data as LocationRow[]) || []) {
      const text = String(d.vi_tri_cu_the || "").trim();
      if (!text) continue;
      const kid = d.khoa_id ? String(d.khoa_id) : null;
      const key = `${kid ?? ""}\t${text}`;
      if (seenPair.has(key)) continue;
      seenPair.add(key);
      historyLocationRows.push({ khoa_id: kid, vi_tri_cu_the: text });
    }
    const historyLocations = Array.from(new Set(historyLocationRows.map((r) => r.vi_tri_cu_the)));

    const rawNhanSuRows = ((nhanSuRes.data || []) as Record<string, unknown>[]) || [];
    let nhanSusEnriched = rawNhanSuRows.map((x) => mapNhanSuViewRow(x));

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

    /**
     * Danh sách nhân sự giới hạn 1000 — người đăng nhập có thể không nằm trong trang đó,
     * khiến in phiếu / tra cứu `ho_ten` theo `nguoi_giam_sat_id` trả về trống hoặc chỉ UUID.
     * Luôn đưa hồ sơ của actor vào đầu mảng khi thiếu.
     */
    if (includeNhanSu && currentHoSoId) {
      const selfKey = String(currentHoSoId).trim();
      const hasSelf = nhanSusEnriched.some(
        (n) => String((n as Record<string, unknown>).id ?? "").trim() === selfKey,
      );
      if (!hasSelf) {
        try {
          const { data: selfRow, error: selfErr } = await supabase
            .from("v_mdm_nhan_su_full")
            .select("*")
            .eq("id", selfKey)
            .eq("is_active", true)
            .maybeSingle();
          if (!selfErr && selfRow) {
            const x = selfRow as Record<string, unknown>;
            nhanSusEnriched = [mapNhanSuViewRow(x), ...nhanSusEnriched];
          }
        } catch {
          /* ignore */
        }
      }
    }

    const rpcKhuVucs = Array.isArray(registry?.KHU_VUC_GIAM_SAT) ? registry.KHU_VUC_GIAM_SAT : [];
    const fallbackKhuVucs = (khuVucFallbackRes.data || []).map((x) => ({
      id: String(x.id || ""),
      ma: String(x.ma_khu_vuc || ""),
      ten: String(x.ten_khu_vuc || ""),
      nhom_mau: String(x.nhom_mau || ""),
      thu_tu: typeof x.thu_tu === "number" ? x.thu_tu : null,
    }));
    const effectiveKhuVucs = rpcKhuVucs.length > 0 ? rpcKhuVucs : fallbackKhuVucs;

    return {
      success: true as const,
      data: {
        currentHoSoId,
        khoas: (registry.KHOA_PHONG || []).map((k: any) => ({
          id: k.id,
          ma_danh_muc: k.ma,
          ten_danh_muc: k.ten,
          specs: k.specs ?? null,
        })),
        khuVucs: effectiveKhuVucs.map((x: any) => ({
          id: x.id,
          ma_danh_muc: x.ma || "",
          ten_danh_muc: x.ten,
          loai_danh_muc: "KHU_VUC_GIAM_SAT",
          source: "registry_lookup" as const,
          nhom_mau: x.nhom_mau ?? null,
          thu_tu: typeof x.thu_tu === "number" ? x.thu_tu : null,
        })),
        ngheNghieps: (registry.NGHE_NGHIEP || []).map((x: any) => ({ id: x.id, ma_danh_muc: x.ma, ten_danh_muc: x.ten })),
        hinhThucGiamSats: (registry.HINH_THUC_GIAM_SAT || []).map((x: any) => ({ id: x.id, ma_danh_muc: x.ma, ten_danh_muc: x.ten })),
        cachThucGiamSats: (registry.CACH_THUC_GIAM_SAT || []).map((x: any) => ({ id: x.id, ma_danh_muc: x.ma, ten_danh_muc: x.ten })),
        nhanSus: nhanSusEnriched,
        historyLocations,
        historyLocationRows,
      },
    };
  } catch (error: unknown) {
    console.error("getSupervisionMasterDataBundle failed:", error);
    return { success: false as const, error: "Lỗi tải danh mục." };
  }
}
