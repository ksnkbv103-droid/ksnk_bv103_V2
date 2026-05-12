// src/modules/quan-tri-he-thong/danh-muc/views/QuanTriDanhMucPage.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, List, Settings, Beaker, Building2, Users, ClipboardList, Database, Layers, IdCard, MapPin } from "lucide-react";
import AdvancedDataTable from "@/components/shared/AdvancedDataTable";
import RBACMatrixView from "@/modules/quan-tri-he-thong/phan-quyen/views/RBACMatrixView";
import { usePermission } from "@/hooks/usePermission";
import {
  mdmGetTrungTamDanhMucStats,
  type TrungTamDanhMucStatsPayload,
} from "@/modules/quan-tri-he-thong/actions/mdm-gateway.actions";
import { DM_HUB_LABELS, getRegistryEntriesForChuyenBietHub } from "@/lib/master-data/domain-registry";
import { getDanhMucAdminPath } from "@/lib/master-data/danh-muc-admin-routes";
import QuanTriDanhMucTabStrip from "./QuanTriDanhMucTabStrip";
import {
  buildMasterHubColumns,
  buildRegistryColumns,
  type HubRegistryRow,
  type MasterCardRow,
} from "./quan-tri-danh-muc-table-columns";

export default function QuanTriDanhMucPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"DANH_MUC" | "DM_REGISTRY" | "PHAN_QUYEN">("DANH_MUC");
  const [stats, setStats] = useState<Partial<TrungTamDanhMucStatsPayload>>({});
  const [loading, setLoading] = useState(true);
  const [registryLoaded, setRegistryLoaded] = useState(false);
  const [registryLoading, setRegistryLoading] = useState(false);
  /** Một hook — tránh gọi RBAC/client Supabase hai lần (hai `useModulePermission` cũ). */
  const { loading: permLoading, isAdmin, canView, canEdit } = usePermission();
  const canViewDanhMuc = canView("DANH_MUC");
  const phanQuyenAllowed = { view: canView("PHAN_QUYEN"), edit: canEdit("PHAN_QUYEN") };
  /** Đồng bộ với `ensureRbacAdmin`: mở/sửa ma trận cần ADMIN hoặc `PHAN_QUYEN.edit`. */
  const canConfigureRbac = isAdmin || phanQuyenAllowed.edit;

  useEffect(() => {
    if (!canViewDanhMuc && canConfigureRbac && activeTab !== "PHAN_QUYEN") setActiveTab("PHAN_QUYEN");
  }, [canViewDanhMuc, canConfigureRbac, activeTab]);

  const go = useCallback((path: string) => router.push(path), [router]);

  useEffect(() => {
    if (searchParams.get("tab") === "dm_registry") setActiveTab("DM_REGISTRY");
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
    if (activeTab !== "DM_REGISTRY" || registryLoaded || loading) return;
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
    { id: "loai", name: "Loại dụng cụ", path: "/quan-tri-he-thong/danh-muc/dung-cu/loai", stats: stats.loai, icon: <LayoutGrid className="h-5 w-5 text-emerald-600" /> },
    { id: "bo", name: "Bộ dụng cụ", path: "/quan-tri-he-thong/danh-muc/dung-cu/bo", stats: stats.bo, icon: <Database className="h-5 w-5 text-blue-600" /> },
    { id: "le", name: "Dụng cụ lẻ", path: "/quan-tri-he-thong/danh-muc/dung-cu/chi-tiet", stats: stats.le, icon: <List className="h-5 w-5 text-indigo-600" /> },
    { id: "tb", name: "Thiết bị và máy", path: "/quan-tri-he-thong/danh-muc/thiet-bi", stats: stats.tb, icon: <Settings className="h-5 w-5 text-slate-600" /> },
    { id: "hc", name: "Hóa chất và vật tư", path: "/quan-tri-he-thong/danh-muc/hoa-chat", stats: stats.hc, icon: <Beaker className="h-5 w-5 text-amber-600" /> },
    { id: "khoa", name: "Khoa phòng", path: "/quan-tri-he-thong/danh-muc/khoa-phong", stats: stats.khoa, icon: <Building2 className="h-5 w-5 text-rose-600" /> },
    {
      id: "khu-vuc-giam-sat",
      name: "Khu vực giám sát",
      path: getDanhMucAdminPath("KHU_VUC_GIAM_SAT"),
      stats: (stats.registryByLoai || {}).KHU_VUC_GIAM_SAT || { count: 0 },
      icon: <MapPin className="h-5 w-5 text-cyan-600" />,
    },
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
      <div className="app-empty-state rounded-2xl border border-slate-200 bg-[var(--bg-panel)] px-8 py-12 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-600">Không đủ quyền truy cập khu danh mục hoặc phân quyền.</p>
        <p className="mt-2 text-xs text-slate-500">Liên hệ quản trị nếu cần được cấp quyền.</p>
      </div>
    );
  }

  if (!canViewDanhMuc && !canConfigureRbac && (phanQuyenAllowed.view || isAdmin)) {
    return (
      <div className="app-empty-state rounded-2xl border border-amber-200 bg-amber-50/40 px-8 py-12 text-center shadow-sm">
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
        <section className="app-data-shell overflow-hidden p-2" aria-labelledby="tab-danhmuc-hub">
          <AdvancedDataTable
            columns={columnsHub}
            data={masterListWithTaiKhoan}
            loading={loading}
            onRowClick={(r) => go(r.path)}
          />
        </section>
      ) : activeTab === "DM_REGISTRY" && canViewDanhMuc ? (
        <section className="space-y-4" aria-labelledby="tab-dm-registry">
          <aside className="rounded-xl border border-sky-200/70 bg-gradient-to-br from-sky-50/80 to-white px-4 py-3 text-sm leading-relaxed text-slate-700 shadow-sm ring-1 ring-sky-900/5">
            <p>
              Đây là các bảng <code className="rounded-md bg-white/80 px-1.5 py-0.5 font-mono text-xs text-slate-800 ring-1 ring-slate-200/80">dm_*</code>{" "}
              theo registry (một loại một bảng nguồn dữ liệu).
              <strong className="font-semibold text-slate-900"> Khoa phòng</strong> và{" "}
              <strong className="font-semibold text-slate-900">Loại dụng cụ</strong> nên chỉnh sửa từ{" "}
              <em>Trung tâm danh mục</em> để đồng bộ biểu mẫu và thống kê.
            </p>
          </aside>
          <div className="app-data-shell overflow-hidden p-2">
            <AdvancedDataTable
              columns={columnsRegistry}
              data={hubDmList}
              loading={loading || registryLoading}
              onRowClick={(r) => go(r.path)}
            />
          </div>
        </section>
      ) : activeTab === "PHAN_QUYEN" && canConfigureRbac ? (
        <section aria-labelledby="tab-phan-quyen">
          <RBACMatrixView />
        </section>
      ) : null}
    </div>
  );
}
