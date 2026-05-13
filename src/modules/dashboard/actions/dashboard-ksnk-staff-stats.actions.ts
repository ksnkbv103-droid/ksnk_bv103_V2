"use server";

import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { getActorKsnkScope } from "@/lib/actor-ksnk-scope-server";
import { verifyAnyPermission, verifyPermissions } from "@/lib/server-permission";
import { effectiveFilterIds } from "../lib/dashboard-hook-helpers";
import type { DashboardKsnkStaffSupervisionRow } from "../compliance-dashboard.types";
import type { FetchDashboardPayloadsInput } from "../lib/fetch-dashboard-payloads-for-type";
import type { ActorKsnkScope } from "@/lib/actor-ksnk-scope.types";

type OverviewBundleInput = Omit<FetchDashboardPayloadsInput, "sType">;

export type KsnkStaffSupervisionBundle = {
  rows: DashboardKsnkStaffSupervisionRow[];
  /** Chỉ true với nhân sự KSNK / mạng lưới KSNK / ADMIN — không gọi RPC khi false. */
  showKsnkStaffWorkload: boolean;
};

function normalizeKsnkStaffRows(raw: unknown): DashboardKsnkStaffSupervisionRow[] {
  if (raw == null) return [];
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((r) => {
    const o = r as Record<string, unknown>;
    return {
      id: String(o.id ?? ""),
      ho_ten: String(o.ho_ten ?? "—"),
      ma_nv: String(o.ma_nv ?? "—"),
      so_co_hoi_vst: Number(o.so_co_hoi_vst ?? 0),
      so_phien_vst: Number(o.so_phien_vst ?? 0),
      so_phien_gsc: Number(o.so_phien_gsc ?? 0),
    };
  });
}

async function verifyComplianceDashboardAccess() {
  await verifyPermissions([{ moduleKey: "DASHBOARD", action: "view" }]);
  await verifyAnyPermission([
    { moduleKey: "GIAM_SAT_CHUNG", action: "view" },
    { moduleKey: "GIAM_SAT_VST", action: "view" },
  ]);
}

function matchesKsnkVaiTroText(v: string | null | undefined): boolean {
  const s = (v || "").trim();
  if (!s) return false;
  const u = s.toUpperCase();
  return (
    u.includes("KSNK") ||
    u.includes("NHAN_VIEN") ||
    u.includes("MANG_LUOI") ||
    u.includes("TO_TRUONG") ||
    u.includes("THANH_VIEN") ||
    s.includes("Kiểm soát") ||
    s.includes("kiểm soát")
  );
}

function matchesKhoaKsnk(ma: string | null | undefined, ten: string | null | undefined): boolean {
  const m = (ma || "").trim().toUpperCase();
  const t = (ten || "").trim().toLowerCase();
  if (m === "KSNK" || m === "C18") return true;
  if (t.includes("kiểm soát") || t.includes("kiem soat")) return true;
  return false;
}

/** Ai được xem bảng “nhân viên Khoa KSNK — hoạt động giám sát” (không áp cho khoa khác). */
export async function resolveViewerMaySeeKsnkStaffWorkload(): Promise<boolean> {
  const scope = await getActorKsnkScope();
  return resolveViewerMaySeeKsnkStaffWorkloadWithScope(scope);
}

async function resolveViewerMaySeeKsnkStaffWorkloadWithScope(scope: ActorKsnkScope): Promise<boolean> {
  if (scope.isAdmin) return true;
  if (scope.isNhanVienKsnk || scope.isMangLuoiKsnk) return true;
  if (!scope.actorNhanSuId) return false;

  const supabase = await createServerSupabaseUserClient();
  const { data: ns, error } = await supabase
    .from("mdm_nhan_su")
    .select("khoa_id, vai_tro_he_thong_ksnk")
    .eq("id", scope.actorNhanSuId)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !ns) return false;
  if (matchesKsnkVaiTroText(ns.vai_tro_he_thong_ksnk)) return true;
  const kid = ns.khoa_id ? String(ns.khoa_id) : "";
  if (!kid) return false;
  const { data: k, error: kErr } = await supabase.from("dm_khoa_phong").select("ma_khoa, ten_khoa").eq("id", kid).maybeSingle();
  if (kErr || !k) return false;
  return matchesKhoaKsnk(k.ma_khoa, k.ten_khoa);
}

/** Thống kê nhân viên KSNK — chỉ trả dữ liệu khi viewer thuộc KSNK / ADMIN; cùng ranh giới bộ lọc dashboard. */
export async function fetchKsnkStaffSupervisionForOverview(p: OverviewBundleInput): Promise<KsnkStaffSupervisionBundle> {
  await verifyComplianceDashboardAccess();
  const scope = await getActorKsnkScope();
  const showKsnkStaffWorkload = await resolveViewerMaySeeKsnkStaffWorkloadWithScope(scope);
  if (!showKsnkStaffWorkload) {
    return { rows: [], showKsnkStaffWorkload: false };
  }

  const supabase = await createServerSupabaseUserClient();
  const isNetwork = scope.isMangLuoiKsnk;
  const effKhoi = effectiveFilterIds(p.selectedKhoiIds, p.khoiOptionCount);
  const effKhoa = effectiveFilterIds(p.selectedKhoaIds, p.khoaOptionCount);
  const effNghe = effectiveFilterIds(p.selectedNgheIds, p.ngheOptionCount);
  const effKhu = effectiveFilterIds(p.selectedKhuVucIds, p.khuOptionCount);

  const p_khoi_ids = isNetwork ? null : effKhoi?.length ? effKhoi : null;
  const p_khoa_ids = isNetwork ? (scope.actorKhoaId ? [scope.actorKhoaId] : null) : effKhoa?.length ? effKhoa : null;
  const p_nghe_nghiep_ids = effNghe?.length ? effNghe : null;
  const p_khu_vuc_ids = effKhu?.length ? effKhu : null;

  const { data, error } = await supabase.rpc("rpc_get_dashboard_ksnk_staff_supervision_stats", {
    p_tu_ngay: p.tuNgay,
    p_den_ngay: p.denNgay,
    p_khoi_ids,
    p_khoa_ids,
    p_nghe_nghiep_ids,
    p_khu_vuc_ids,
  });
  if (error) {
    console.error("[Dashboard] rpc_get_dashboard_ksnk_staff_supervision_stats", error.message);
    return { rows: [], showKsnkStaffWorkload: true };
  }
  return { rows: normalizeKsnkStaffRows(data), showKsnkStaffWorkload: true };
}
