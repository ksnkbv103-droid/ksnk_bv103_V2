"use client";

import React, { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import RBACMatrixView from "@/modules/quan-tri-he-thong/phan-quyen/views/RBACMatrixView";
import TaiKhoanTruyCapHubPage from "@/modules/quan-tri-he-thong/tai-khoan-nhan-su/views/TaiKhoanTruyCapHubPage";
import MdmGovernanceView from "../../views/MdmGovernanceView";
import { usePermission } from "@/hooks/usePermission";
import { quanTriHubHref } from "@/lib/master-data/quan-tri-paths";
import QuanTriDanhMucTabStrip, { type QuanTriHubUiTab } from "./QuanTriDanhMucTabStrip";
import QuanTriHubWorkQueue from "./QuanTriHubWorkQueue";
import { SystemHealthPanel } from "../../components/SystemHealthPanel";

/**
 * AR-8g (PO 2026-11-11): Quản trị chỉ còn 3 việc — Tài khoản · Phân quyền · Hệ thống.
 * Danh mục nghiệp vụ sửa trong module sở hữu (Tổ chức, GSC, CSSD, NKBV).
 */
function uiTabFromQuery(tab: string | null): QuanTriHubUiTab | null {
  if (tab === "tai_khoan") return "TAI_KHOAN";
  if (tab === "phan_quyen") return "PHAN_QUYEN";
  if (tab === "mdm_governance" || tab === "suc_khoe") return "IT";
  return null;
}

const UI_TAB_HREF: Record<QuanTriHubUiTab, string> = {
  TAI_KHOAN: quanTriHubHref("TAI_KHOAN"),
  PHAN_QUYEN: quanTriHubHref("PHAN_QUYEN"),
  IT: quanTriHubHref("MDM_GOVERNANCE"),
};

export default function QuanTriDanhMucPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading: permLoading, isAdmin, canView, canEdit } = usePermission();

  // Cùng cổng với route server: tài khoản = ADMIN hoặc PHAN_QUYEN xem+sửa; ma trận = ADMIN.
  const canTaiKhoan = isAdmin || (canView("PHAN_QUYEN") && canEdit("PHAN_QUYEN"));
  const canViewRbac = isAdmin;
  const canViewDanhMuc = canView("DANH_MUC");
  const canAccessIt = canViewDanhMuc || isAdmin;

  const visibleTabs = useMemo(() => {
    const tabs: QuanTriHubUiTab[] = [];
    if (canTaiKhoan) tabs.push("TAI_KHOAN");
    if (canViewRbac) tabs.push("PHAN_QUYEN");
    if (canAccessIt) tabs.push("IT");
    return tabs;
  }, [canTaiKhoan, canViewRbac, canAccessIt]);

  // URL là nguồn của tab; tab không đủ quyền / thiếu → tab đầu tiên được phép.
  const rawTab = searchParams.get("tab");
  const requested = uiTabFromQuery(rawTab);
  const uiTab = requested && visibleTabs.includes(requested) ? requested : visibleTabs[0];

  const setHubTab = useCallback(
    (tab: QuanTriHubUiTab) => router.replace(UI_TAB_HREF[tab], { scroll: false }),
    [router],
  );
  const go = useCallback((path: string) => router.push(path), [router]);

  if (permLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center" aria-busy="true">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--primary)]" />
      </div>
    );
  }

  if (!uiTab) {
    return (
      <div className="app-empty-state rounded-[var(--radius-shell)] border border-slate-200 bg-[var(--bg-panel)] px-5 py-8 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-600">Không đủ quyền khu Quản trị.</p>
        <p className="mt-2 text-xs text-slate-500">
          Cần vai trò quản trị, quyền sửa PHAN_QUYEN (tài khoản) hoặc quyền xem DANH_MUC (hệ thống).
        </p>
      </div>
    );
  }

  return (
    <div className="bv103-stack-page pb-8">
      <QuanTriDanhMucTabStrip active={uiTab} onChange={setHubTab} visibleTabs={visibleTabs} />

      {uiTab === "TAI_KHOAN" ? (
        <section id="panel-tai-khoan" role="tabpanel" aria-labelledby="tab-tai-khoan">
          <TaiKhoanTruyCapHubPage />
        </section>
      ) : uiTab === "PHAN_QUYEN" ? (
        <section id="panel-phan-quyen" role="tabpanel" aria-labelledby="tab-phan-quyen">
          <RBACMatrixView />
        </section>
      ) : (
        <section
          id="panel-danh-cho-it"
          role="tabpanel"
          className="space-y-[var(--bv103-space-3)]"
          aria-labelledby="tab-danh-cho-it"
        >
          <QuanTriHubWorkQueue onOpen={go} />
          {canViewDanhMuc || isAdmin ? <MdmGovernanceView /> : null}
          <SystemHealthPanel />
        </section>
      )}
    </div>
  );
}
