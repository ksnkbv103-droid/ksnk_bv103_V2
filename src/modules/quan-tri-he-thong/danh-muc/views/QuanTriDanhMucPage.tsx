// src/modules/quan-tri-he-thong/danh-muc/views/QuanTriDanhMucPage.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, Settings, Beaker, Building2, Users, ClipboardList, Layers, IdCard } from "lucide-react";
import AdvancedDataTable from "@/components/shared/AdvancedDataTable";
import RBACMatrixView from "@/modules/quan-tri-he-thong/phan-quyen/views/RBACMatrixView";
import MdmGovernanceView from "../../views/MdmGovernanceView";
import { usePermission } from "@/hooks/usePermission";
import { mdmGetTrungTamDanhMucStats } from "@/modules/quan-tri-he-thong/actions/mdm-gateway.actions";
import type { TrungTamDanhMucStatsPayload } from "@/modules/quan-tri-he-thong/actions/mdm-gateway.types";
import { DM_HUB_LABELS, getRegistryEntriesForChuyenBietHub } from "@/lib/master-data/domain-registry";
import { getDanhMucAdminPath } from "@/lib/master-data/danh-muc-admin-routes";
import QuanTriDanhMucTabStrip from "./QuanTriDanhMucTabStrip";
import SearchBar from "@/components/shared/SearchBar";
import {
  buildMasterHubColumns,
  buildRegistryColumns,
  type HubRegistryRow,
  type MasterCardRow,
} from "./quan-tri-danh-muc-table-columns";

function filterMasterHub(rows: MasterCardRow[], q: string) {
  const t = q.trim().toLowerCase();
  if (!t) return rows;
  return rows.filter((r) => r.name.toLowerCase().includes(t) || r.path.toLowerCase().includes(t));
}

function filterRegistryHub(rows: HubRegistryRow[], q: string) {
  const t = q.trim().toLowerCase();
  if (!t) return rows;
  return rows.filter(
    (r) =>
      r.name.toLowerCase().includes(t) ||
      r.path.toLowerCase().includes(t) ||
      (r.subtitle != null && String(r.subtitle).toLowerCase().includes(t)),
  );
}

export default function QuanTriDanhMucPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"DANH_MUC" | "PHAN_QUYEN" | "MDM_GOVERNANCE">("DANH_MUC");
  const [stats, setStats] = useState<Partial<TrungTamDanhMucStatsPayload>>({});
  const [loading, setLoading] = useState(true);
  const [registryLoaded, setRegistryLoaded] = useState(false);
  const [registryLoading, setRegistryLoading] = useState(false);
  const [hubSearch, setHubSearch] = useState("");
  const [registrySearch, setRegistrySearch] = useState("");
  /** Một hook — tránh gọi RBAC/client Supabase hai lần (hai `useModulePermission` cũ). */
  const { loading: permLoading, isAdmin, canView, canEdit } = usePermission();
  const canViewDanhMuc = canView("DANH_MUC");
  const phanQuyenAllowed = { view: canView("PHAN_QUYEN"), edit: canEdit("PHAN_QUYEN") };
  /** Đồng bộ với `ensureRbacAdmin`: mở/sửa ma trận cần ADMIN hoặc `PHAN_QUYEN.edit`. */
  const canConfigureRbac = isAdmin || phanQuyenAllowed.edit;

  useEffect(() => {
    if (!canViewDanhMuc && canConfigureRbac && activeTab !== "PHAN_QUYEN") setActiveTab("PHAN_QUYEN");
  }, [canViewDanhMuc, canConfigureRbac, activeTab]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "dm_registry") {
      setActiveTab("DANH_MUC");
      requestAnimationFrame(() => {
        document.getElementById("dm-lookup-registry")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } else if (tab === "phan_quyen") setActiveTab("PHAN_QUYEN");
    else if (tab === "mdm_governance") setActiveTab("MDM_GOVERNANCE");
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    async function fetchStats() {
      const result = await mdmGetTrungTamDanhMucStats({ includeRegistry: false });
      if (cancelled) return;
      if (result.success) setStats((result.data || {}) as Partial<TrungTamDanhMucStatsPayload>);
      setLoading(false);
    }
    void fetchStats();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (activeTab !== "DANH_MUC" || registryLoaded || loading) return;
    let cancelled = false;
    setRegistryLoading(true);
    void mdmGetTrungTamDanhMucStats({ includeRegistry: true }).then((result) => {
      if (cancelled) return;
      if (result.success) {
        setStats((prev) => ({
          ...prev,
          ...(result.data || {}),
          registryByLoai: result.data?.registryByLoai || prev.registryByLoai,
        }));
        setRegistryLoaded(true);
      }
      setRegistryLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [activeTab, registryLoaded, loading]);

  const masterList: MasterCardRow[] = [
    {
      id: "dung-cu",
      name: "Quản lý dụng cụ",
      path: "/quan-tri-he-thong/danh-muc/dung-cu",
      stats: { count: (stats.loai?.count || 0) + (stats.bo?.count || 0) + (stats.le?.count || 0) },
      icon: <LayoutGrid className="h-5 w-5 text-emerald-600" />,
    },
    { id: "tb", name: "Thiết bị và máy", path: "/quan-tri-he-thong/danh-muc/thiet-bi", stats: stats.tb, icon: <Settings className="h-5 w-5 text-slate-600" /> },
    { id: "hc", name: "Hóa chất và vật tư", path: "/quan-tri-he-thong/danh-muc/hoa-chat", stats: stats.hc, icon: <Beaker className="h-5 w-5 text-amber-600" /> },
    { id: "khoa", name: "Khoa phòng", path: "/quan-tri-he-thong/danh-muc/khoa-phong", stats: stats.khoa, icon: <Building2 className="h-5 w-5 text-rose-600" /> },
    { id: "ns", name: "Hồ sơ nhân sự", path: "/quan-tri-he-thong/nhan-su", stats: stats.ns, icon: <Users className="h-5 w-5 text-green-600" /> },
    { id: "bk", name: "Mẫu bảng kiểm", path: "/quan-tri-he-thong/bang-kiem", stats: stats.bk, icon: <ClipboardList className="h-5 w-5 text-orange-600" /> },
  ];

  const taiKhoanCard =
    canConfigureRbac ?
      ({
        id: "tk",
        name: "Tài khoản và vai trò KSNK",
        path: "/quan-tri-he-thong/tai-khoan-nhan-su",
        stats: stats.tk,
        icon: <IdCard className="h-5 w-5 text-teal-700" />,
      } satisfies MasterCardRow)
    : null;

  const masterListWithTaiKhoan: MasterCardRow[] = taiKhoanCard ? [...masterList, taiKhoanCard] : masterList;

  const hubDmList = useMemo((): HubRegistryRow[] => {
    const byLoai = stats.registryByLoai || {};
    return getRegistryEntriesForChuyenBietHub().map((e) => ({
      id: e.loaiDanhMuc,
      name: DM_HUB_LABELS[e.loaiDanhMuc] || e.loaiDanhMuc,
      path: getDanhMucAdminPath(e.loaiDanhMuc),
      stats: byLoai[e.loaiDanhMuc] || { count: 0 },
      icon: <Layers className="h-5 w-5 text-teal-600" />,
      subtitle: e.sourceTable,
    }));
  }, [stats.registryByLoai]);

  const go = useCallback((path: string) => router.push(path), [router]);

  const filteredHub = useMemo(
    () => filterMasterHub(masterListWithTaiKhoan, hubSearch),
    [masterListWithTaiKhoan, hubSearch],
  );
  const filteredRegistry = useMemo(
    () => filterRegistryHub(hubDmList, registrySearch),
    [hubDmList, registrySearch],
  );

  const columnsHub = useMemo(() => buildMasterHubColumns(go), [go]);
  const columnsRegistry = useMemo(() => buildRegistryColumns(go), [go]);

  if (permLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center" aria-busy="true" aria-live="polite">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--primary)]" />
      </div>
    );
  }

  if (!(canViewDanhMuc || phanQuyenAllowed.view || isAdmin)) {
    return (
      <div className="app-empty-state rounded-[var(--radius-shell)] border border-slate-200 bg-[var(--bg-panel)] px-8 py-12 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-600">Không đủ quyền truy cập khu danh mục hoặc phân quyền.</p>
        <p className="mt-2 text-xs text-slate-500">Liên hệ quản trị nếu cần được cấp quyền.</p>
      </div>
    );
  }

  if (!canViewDanhMuc && !canConfigureRbac && (phanQuyenAllowed.view || isAdmin)) {
    return (
      <div className="app-empty-state rounded-[var(--radius-shell)] border border-amber-200 bg-amber-50/40 px-8 py-12 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-800">
          Tài khoản có nhắc tới quyền Phân quyền nhưng chưa đủ quyền <strong>Sửa</strong> ma trận và không có quyền Danh mục.
        </p>
        <p className="mt-2 text-xs text-slate-600">
          Người dùng cần thêm action <strong>edit</strong> trên module <strong>PHAN_QUYEN</strong> hoặc quyền xem/chỉnh Danh mục để làm việc tại đây.
        </p>
      </div>
    );
  }

  return (
    <div className="touch-manipulation space-y-8 pb-16 animate-in fade-in duration-500">
      <QuanTriDanhMucTabStrip
        active={activeTab}
        onChange={setActiveTab}
        canAccessDmTabs={canViewDanhMuc}
        canConfigureRbac={canConfigureRbac}
      />

      {activeTab === "DANH_MUC" && canViewDanhMuc ? (
        <div className="space-y-10">
          <section className="space-y-4" aria-labelledby="tab-danhmuc-hub">
            <h2 id="tab-danhmuc-hub" className="text-sm font-semibold text-slate-800">
              Trang quản lý riêng
            </h2>
            <p className="text-xs text-slate-500">Khoa, dụng cụ, nhân sự, bảng kiểm — mỗi mục một màn hình đầy đủ.</p>
            <div className="app-data-shell overflow-hidden p-2">
              <div className="mb-2 min-w-0 px-1">
                <SearchBar value={hubSearch} onChange={setHubSearch} placeholder="Tìm trang danh mục…" />
              </div>
              <AdvancedDataTable
                columns={columnsHub}
                data={filteredHub}
                loading={loading}
                onRowClick={(r) => go(r.path)}
                hideSearch
                tableClassName="w-full min-w-0 table-fixed border-collapse text-left text-sm"
              />
            </div>
          </section>
          <section className="space-y-4 scroll-mt-24" id="dm-lookup-registry" aria-labelledby="dm-lookup-registry-heading">
            <h2 id="dm-lookup-registry-heading" className="text-sm font-semibold text-slate-800">
              Danh mục lookup (sys_lookup_value)
            </h2>
            <p className="text-xs text-slate-500">
              Tổ công tác, chức danh, loại công việc, khu vực giám sát… — bảng module (mdm_dm_*, gstt_dm_*, qlcv_dm_*, …).
            </p>
            <div className="app-data-shell overflow-hidden p-2">
              <div className="mb-2 min-w-0 px-1">
                <SearchBar value={registrySearch} onChange={setRegistrySearch} placeholder="Tìm theo tên hoặc bảng…" />
              </div>
              <AdvancedDataTable
                columns={columnsRegistry}
                data={filteredRegistry}
                loading={loading || registryLoading}
                onRowClick={(r) => go(r.path)}
                hideSearch
                tableClassName="w-full min-w-0 table-fixed border-collapse text-left text-sm"
              />
            </div>
          </section>
        </div>
      ) : activeTab === "PHAN_QUYEN" && canConfigureRbac ? (
        <section aria-labelledby="tab-phan-quyen">
          <RBACMatrixView />
        </section>
      ) : activeTab === "MDM_GOVERNANCE" && canViewDanhMuc ? (
        <section aria-labelledby="tab-mdm-governance">
          <MdmGovernanceView />
        </section>
      ) : null}
    </div>
  );
}
