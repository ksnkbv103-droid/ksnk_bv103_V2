"use server";

import { unstable_cache } from "next/cache";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "../../actions/verify-permission";
import { ADMIN_MODULE_STATS_TAG } from "@/lib/cache/revalidate-master-data-tags";
import type { DanhMucStat, TrungTamDanhMucStatsPayload } from "./danh-muc-hybrid.types";

/**
 * Slice 9 (26/05/2026):
 * - 1 round-trip RPC `fn_admin_module_stats` thay cho ~50 query Promise.all cũ.
 * - Wrap bằng `unstable_cache` (TTL 60s) + tag `admin-module-stats`.
 *   Mọi mutation `master-crud-core` đều `revalidateTag(ADMIN_MODULE_STATS_TAG)`.
 */

type AdminStatsPayload = {
  core: Record<string, DanhMucStat>;
  registry: Record<string, DanhMucStat>;
};

const STATS_CORE_KEYS = ["loai", "bo", "le", "tb", "hc", "khoa", "ns", "bk", "tk"] as const;

function normalizeStat(input: unknown): DanhMucStat {
  if (!input || typeof input !== "object") return { count: 0 };
  const row = input as { count?: unknown; last?: unknown };
  const count = typeof row.count === "number" ? row.count : Number(row.count ?? 0);
  const last = typeof row.last === "string" && row.last.trim() ? row.last : undefined;
  return { count: Number.isFinite(count) ? count : 0, last };
}

const loadAdminStatsRaw = unstable_cache(
  async (): Promise<AdminStatsPayload> => {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase.rpc("fn_admin_module_stats");
    if (error) {
      console.error("[admin-module-stats] RPC error:", error.message);
      return { core: {}, registry: {} };
    }
    const payload = (data ?? {}) as Partial<AdminStatsPayload>;
    return {
      core: (payload.core ?? {}) as Record<string, DanhMucStat>,
      registry: (payload.registry ?? {}) as Record<string, DanhMucStat>,
    };
  },
  ["admin-module-stats"],
  { revalidate: 60, tags: [ADMIN_MODULE_STATS_TAG] },
);

/** Thống kê nhanh cho Trung tâm Danh mục — 1 round-trip + cache 60s. */
export async function getTrungTamDanhMucStatsAction(options?: { includeRegistry?: boolean }) {
  try {
    await verifyPermission("DANH_MUC", "view");
    const raw = await loadAdminStatsRaw();

    const core = STATS_CORE_KEYS.reduce<Record<string, DanhMucStat>>((acc, key) => {
      acc[key] = normalizeStat(raw.core?.[key]);
      return acc;
    }, {});

    const registryByLoai: Record<string, DanhMucStat> = {};
    if (options?.includeRegistry) {
      for (const [k, v] of Object.entries(raw.registry ?? {})) {
        registryByLoai[k] = normalizeStat(v);
      }
    } else {
      const khuVuc = raw.registry?.KHU_VUC_GIAM_SAT;
      if (khuVuc) registryByLoai.KHU_VUC_GIAM_SAT = normalizeStat(khuVuc);
    }

    const payload: TrungTamDanhMucStatsPayload = {
      loai: core.loai,
      bo: core.bo,
      le: core.le,
      tb: core.tb,
      hc: core.hc,
      khoa: core.khoa,
      ns: core.ns,
      bk: core.bk,
      tk: core.tk,
      registryByLoai,
    };

    return { success: true as const, data: payload };
  } catch (error: unknown) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
