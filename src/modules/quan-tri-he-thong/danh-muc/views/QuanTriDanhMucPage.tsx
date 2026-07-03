// src/modules/quan-tri-he-thong/danh-muc/views/QuanTriDanhMucPage.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Beaker, Building2, ClipboardList, Database, Layers, List, Settings, Users } from "lucide-react";
import AdvancedDataTable from "@/components/shared/AdvancedDataTable";
import RBACMatrixView from "@/modules/quan-tri-he-thong/phan-quyen/views/RBACMatrixView";
import MdmGovernanceView from "../../views/MdmGovernanceView";
import { usePermission } from "@/hooks/usePermission";
import { mdmGetTrungTamDanhMucStats } from "@/modules/quan-tri-he-thong/actions/mdm-gateway.actions";
import type { TrungTamDanhMucStatsPayload } from "@/modules/quan-tri-he-thong/actions/mdm-gateway.types";
import {
  DANH_MUC_DOMAIN_BADGE,
  DANH_MUC_HUB_GROUP_LABELS,
  filterDanhMucHubRows,
  getAllDanhMucHubRows,
  getRecentDanhMucHubChanges,
  groupDanhMucHubRows,
  type DanhMucHubRow,
} from "@/lib/master-data/danh-muc-hub-catalog";
import QuanTriDanhMucTabStrip from "./QuanTriDanhMucTabStrip";
import SearchBar from "@/components/shared/SearchBar";
import { buildUnifiedHubColumns, type UnifiedHubRow } from "./quan-tri-danh-muc-table-columns";
import OrgStructurePanel, { DanhMucRecentChangesPanel } from "./QuanTriDanhMucHubPanels";

const HUB_ICONS: Record<string, React.ReactNode> = {
  "dung-cu-loai": <Layers className="h-5 w-5 text-emerald-600" />,
  "dung-cu-bo": <Database className="h-5 w-5 text-teal-700" />,
  "dung-cu-le": <List className="h-5 w-5 text-indigo-600" />,
  tb: <Settings className="h-5 w-5 text-slate-600" />,
  hc: <Beaker className="h-5 w-5 text-amber-600" />,
  khoa: <Building2 className="h-5 w-5 text-rose-600" />,
  ns: <Users className="h-5 w-5 text-green-600" />,
  bk: <ClipboardList className="h-5 w-5 text-orange-600" />,
  tk: <Users className="h-5 w-5 text-teal-700" />,
  "phan-quyen": <Settings className="h-5 w-5 text-slate-600" />,
};

function toUnifiedRow(row: DanhMucHubRow): UnifiedHubRow {
  const badge = DANH_MUC_DOMAIN_BADGE[row.domain];
  return {
    id: row.id,
    name: row.name,
    path: row.path,
    stats: row.stats || { count: 0 },
    icon: HUB_ICONS[row.id] ?? <Layers className="h-5 w-5 text-teal-600" />,
    subtitle: row.sourceTable,
    domainLabel: badge.label,
    domainClassName: badge.className,
    groupLabel: DANH_MUC_HUB_GROUP_LABELS[row.group],
    tierLabel: row.tier === "dedicated" ? "Trang riêng" : "Lookup",
  };
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
  const { loading: permLoading, isAdmin, canView, canEdit } = usePermission();
  const canViewDanhMuc = canView("DANH_MUC");
  const phanQuyenAllowed = { view: canView("PHAN_QUYEN"), edit: canEdit("PHAN_QUYEN") };
  const canConfigureRbac = isAdmin || phanQuyenAllowed.edit;

  useEffect(() => {
    if (!canViewDanhMuc && canConfigureRbac && activeTab !== "PHAN_QUYEN") setActiveTab("PHAN_QUYEN");
  }, [canViewDanhMuc, canConfigureRbac, activeTab]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "dm_registry") {
      setActiveTab("DANH_MUC");
      requestAnimationFrame(() => {
        document.getElementById("dm-unified-catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } else if (tab === "phan_quyen") setActiveTab("PHAN_QUYEN");
    else if (tab === "mdm_governance") setActiveTab("MDM_GOVERNANCE");
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    void mdmGetTrungTamDanhMucStats({ includeRegistry: false }).then((result) => {
      if (cancelled) return;
      if (result.success) setStats((result.data || {}) as Partial<TrungTamDanhMucStatsPayload>);
      setLoading(false);
    });
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

  const catalogRows = useMemo(
    () => getAllDanhMucHubRows({ stats, includeTaiKhoan: canConfigureRbac }),
    [stats, canConfigureRbac],
  );
  const filteredCatalog = useMemo(() => filterDanhMucHubRows(catalogRows, hubSearch), [catalogRows, hubSearch]);
  const grouped = useMemo(() => groupDanhMucHubRows(filteredCatalog), [filteredCatalog]);
  const recentChanges = useMemo(() => getRecentDanhMucHubChanges(catalogRows), [catalogRows]);
  const unifiedFlat = useMemo(() => filteredCatalog.map(toUnifiedRow), [filteredCatalog]);

  const go = useCallback((path: string) => router.push(path), [router]);
  const columns = useMemo(() => buildUnifiedHubColumns(go), [go]);

  const khoiCount = stats.registryByLoai?.KHOI_KHOA?.count;

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
        <div className="space-y-6" id="dm-unified-catalog">
          <div className="grid gap-4 lg:grid-cols-2">
            <OrgStructurePanel khoiCount={khoiCount} khoaCount={stats.khoa?.count} />
            <DanhMucRecentChangesPanel rows={recentChanges} onOpen={go} />
          </div>

          <section className="space-y-4" aria-labelledby="tab-danhmuc-unified">
            <div>
              <h2 id="tab-danhmuc-unified" className="text-sm font-semibold text-slate-800">
                Trung tâm danh mục
              </h2>
              <p className="text-xs text-slate-500">
                Một danh sách thống nhất — trang riêng và lookup — tìm kiếm xuyên catalog.
              </p>
            </div>
            <div className="app-data-shell overflow-hidden p-2">
              <div className="mb-2 min-w-0 px-1">
                <SearchBar value={hubSearch} onChange={setHubSearch} placeholder="Tìm danh mục, domain, bảng…" />
              </div>
              {hubSearch.trim() ? (
                <AdvancedDataTable
                  columns={columns}
                  data={unifiedFlat}
                  loading={loading || registryLoading}
                  onRowClick={(r) => go(r.path)}
                  hideSearch
                  tableClassName="w-full min-w-0 table-fixed border-collapse text-left text-sm"
                />
              ) : (
                <div className="space-y-8 px-1 pb-2">
                  {grouped.map((section) => (
                    <div key={section.group} className="space-y-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{section.label}</h3>
                      <AdvancedDataTable
                        columns={columns}
                        data={section.rows.map(toUnifiedRow)}
                        loading={loading || registryLoading}
                        onRowClick={(r) => go(r.path)}
                        hideSearch
                        tableClassName="w-full min-w-0 table-fixed border-collapse text-left text-sm"
                      />
                    </div>
                  ))}
                </div>
              )}
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
