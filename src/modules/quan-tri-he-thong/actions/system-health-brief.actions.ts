"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { isCssdUnifiedBoMa } from "@/lib/domain/cssd-bo-ma";
export type SystemHealthMetric = {
  id: string;
  label: string;
  count: number;
  total: number | null;
  hint: string;
  href: string;
  severity: "ok" | "warn" | "info";
};

export type SystemHealthBrief = {
  metrics: SystemHealthMetric[];
  generatedAt: string;
};

/**
 * Thống kê mô tả sức khỏe master / tài khoản — Quản trị hệ thống.
 * Không trộn CCS / BI lâm sàng.
 */
export async function fetchSystemHealthBrief(): Promise<
  { success: true; data: SystemHealthBrief } | { success: false; error: string }
> {
  try {
    await verifyPermission("DANH_MUC", "view");
  } catch {
    try {
      await verifyPermission("PHAN_QUYEN", "view");
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Không đủ quyền xem sức khỏe hệ thống",
      };
    }
  }

  const supabase = createAdminSupabaseClient();
  const metrics: SystemHealthMetric[] = [];

  const [nvRes, khoaRes, boRes, bkRes] = await Promise.all([
    supabase
      .from("mdm_nhan_su")
      .select("id, auth_user_id", { count: "exact" })
      .eq("is_active", true),
    supabase
      .from("mdm_dm_khoa_phong")
      .select("id, khoi_id", { count: "exact" })
      .eq("is_active", true),
    supabase.from("cssd_dm_bo_dung_cu").select("id, ma_bo").eq("is_active", true),
    supabase
      .from("gstt_dm_bang_kiem")
      .select("id, ma_bk, ap_dung_jsonb")
      .eq("is_active", true),
  ]);

  if (!nvRes.error && nvRes.data) {
    const total = nvRes.count ?? nvRes.data.length;
    const chuaLink = nvRes.data.filter((r) => !r.auth_user_id).length;
    metrics.push({
      id: "auth-link",
      label: "Nhân sự chưa có tài khoản đăng nhập",
      count: chuaLink,
      total,
      hint: "Hồ sơ đang dùng chưa tạo đăng nhập — không vào được phần mềm.",
      href: "/quan-tri-he-thong/tai-khoan-nhan-su",
      severity: chuaLink > 0 ? "warn" : "ok",
    });
  }

  if (!khoaRes.error && khoaRes.data) {
    const total = khoaRes.count ?? khoaRes.data.length;
    const noKhoi = khoaRes.data.filter((r) => !String(r.khoi_id || "").trim()).length;
    metrics.push({
      id: "khoa-khoi",
      label: "Khoa chưa gắn khối",
      count: noKhoi,
      total,
      hint: "Khoa chưa gắn khối — lọc/so sánh theo khối trên thống kê dễ lệch.",
      href: "/quan-tri-he-thong/danh-muc/khoa-phong",
      severity: noKhoi > 0 ? "warn" : "ok",
    });
  }

  if (!boRes.error && boRes.data) {
    const total = boRes.data.length;
    const invalid = boRes.data.filter((r) => !isCssdUnifiedBoMa(String(r.ma_bo || ""))).length;
    metrics.push({
      id: "bo-ma",
      label: "Bộ thiếu mã chuẩn",
      count: invalid,
      total,
      hint: "Bộ chưa đủ mã chuẩn thì không vào quy trình CSSD.",
      href: "/quan-tri-he-thong/danh-muc/dung-cu",
      severity: invalid > 0 ? "warn" : "ok",
    });
  }

  if (!bkRes.error && bkRes.data) {
    const total = bkRes.data.length;
    let thieuApDung = 0;
    for (const row of bkRes.data) {
      const raw = row.ap_dung_jsonb;
      if (!raw || typeof raw !== "object" || Object.keys(raw as object).length === 0) {
        thieuApDung += 1;
      }
    }
    metrics.push({
      id: "bk-ap-dung",
      label: "Bảng kiểm chưa chọn khoa áp dụng",
      count: thieuApDung,
      total,
      hint: "Chưa chọn khoa áp dụng — thống kê bao phủ dễ lệch.",
      href: "/quan-tri-he-thong/bang-kiem",
      severity: thieuApDung > 0 ? "warn" : "ok",
    });
  }

  if (metrics.length === 0) {
    return { success: false, error: "Không tải được các nguồn sức khỏe hệ thống" };
  }

  return {
    success: true,
    data: { metrics, generatedAt: new Date().toISOString() },
  };
}
