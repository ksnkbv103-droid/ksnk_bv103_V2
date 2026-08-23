"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AdvancedDataTable from "@/components/shared/AdvancedDataTable";
import RBACMatrixView from "@/modules/quan-tri-he-thong/phan-quyen/views/RBACMatrixView";
import MdmGovernanceView from "../../views/MdmGovernanceView";
import { usePermission } from "@/hooks/usePermission";
import { mdmGetTrungTamDanhMucStats } from "@/modules/quan-tri-he-thong/actions/mdm-gateway.actions";
import type { TrungTamDanhMucStatsPayload } from "@/modules/quan-tri-he-thong/actions/mdm-gateway.types";
import { filterDanhMucHubRows, getAllDanhMucHubRows } from "@/lib/master-data/danh-muc-hub-catalog";
import { visibleHubRows } from "@/lib/master-data/quan-tri-hub-jobs";
import type { QuanTriHubJobId } from "@/lib/master-data/quan-tri-hub-jobs";
import { quanTriHubHref, type QuanTriHubTab } from "@/lib/master-data/quan-tri-paths";
import QuanTriDanhMucTabStrip, { type QuanTriHubUiTab } from "./QuanTriDanhMucTabStrip";
import SearchBar from "@/components/shared/SearchBar";
import { buildUnifiedHubColumns, toUnifiedHubRow } from "./quan-tri-danh-muc-table-columns";
import QuanTriHubJobCards from "./QuanTriHubJobCards";
import QuanTriHubWorkQueue from "./QuanTriHubWorkQueue";
import { SystemHealthPanel } from "../../components/SystemHealthPanel";

function uiTabFromQuery(tab: string | null): QuanTriHubUiTab {
  if (tab === "phan_quyen") return "PHAN_QUYEN";
  if (tab === "mdm_governance" || tab === "suc_khoe") return "IT";
  return "DANH_MUC";
}

export default function QuanTriDanhMucPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [uiTab, setUiTab] = useState<QuanTriHubUiTab>("DANH_MUC");
  const [stats, setStats] = useState<Partial<TrungTamDanhMucStatsPayload>>({});
  const [loading, setLoading] = useState(true);
  const [hubSearch, setHubSearch] = useState("");
  const { loading: permLoading, isAdmin, canView } = usePermission();
  const canViewDanhMuc = canView("DANH_MUC");
  const canViewNhanSu = canView("NHAN_SU");
  const canViewRbac = isAdmin || canView("PHAN_QUYEN");
  const canAccessJobs = canViewDanhMuc || canViewNhanSu || isAdmin;
  const canAccessIt = canViewDanhMuc || isAdmin;

  const setHubTab = useCallback(
    (tab: QuanTriHubTab) => {
      setUiTab(tab === "PHAN_QUYEN" ? "PHAN_QUYEN" : tab === "DANH_MUC" ? "DANH_MUC" : "IT");
      router.replace(quanTriHubHref(tab), { scroll: false });
    },
    [router],
  );

  useEffect(() => {
    if (!canAccessJobs && canViewRbac && uiTab !== "PHAN_QUYEN") setHubTab("PHAN_QUYEN");
  }, [canAccessJobs, canViewRbac, uiTab, setHubTab]);

  useEffect(() => {
    const raw = searchParams.get("tab");
    setUiTab(uiTabFromQuery(raw));
    if (raw === "dm_registry") {
      requestAnimationFrame(() => {
        document.getElementById("dm-unified-catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    void mdmGetTrungTamDanhMucStats({ includeRegistry: true }).then((result) => {
      if (cancelled) return;
      if (result.success) setStats((result.data || {}) as Partial<TrungTamDanhMucStatsPayload>);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const catalogRows = useMemo(
    () => getAllDanhMucHubRows({ stats, includeTaiKhoan: canViewRbac }),
    [stats, canViewRbac],
  );
  const filteredCatalog = useMemo(() => {
    const matched = filterDanhMucHubRows(catalogRows, hubSearch);
    return visibleHubRows(matched, hubSearch);
  }, [catalogRows, hubSearch]);
  const unifiedFlat = useMemo(() => filteredCatalog.map((r) => toUnifiedHubRow(r)), [filteredCatalog]);
  const go = useCallback((path: string) => router.push(path), [router]);
  const columns = useMemo(() => buildUnifiedHubColumns(go), [go]);

  const allowedJobs = useMemo((): QuanTriHubJobId[] => {
    const jobs: QuanTriHubJobId[] = [];
    if (canViewDanhMuc || canViewNhanSu || isAdmin) jobs.push("to-chuc");
    if (canViewDanhMuc || isAdmin) {
      jobs.push("bang-kiem", "cssd");
    }
    if (canViewRbac) jobs.push("nguoi-dung");
    return jobs;
  }, [canViewDanhMuc, canViewNhanSu, canViewRbac, isAdmin]);

  if (permLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center" aria-busy="true">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--primary)]" />
      </div>
    );
  }

  if (!(canAccessJobs || canViewRbac)) {
    return (
      <div className="app-empty-state rounded-[var(--radius-shell)] border border-slate-200 bg-[var(--bg-panel)] px-8 py-12 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-600">Không đủ quyền khu Quản trị.</p>
        <p className="mt-2 text-xs text-slate-500">Cần quyền Danh mục, Nhân sự, Phân quyền, hoặc vai trò quản trị.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-500 sm:space-y-8 sm:pb-16">
      <QuanTriDanhMucTabStrip
        active={uiTab}
        onChange={(t) => {
          if (t === "DANH_MUC") setHubTab("DANH_MUC");
          else if (t === "PHAN_QUYEN") setHubTab("PHAN_QUYEN");
          else setHubTab("MDM_GOVERNANCE");
        }}
        canAccessJobs={canAccessJobs}
        canViewRbac={canViewRbac}
        canAccessIt={canAccessIt}
      />

      {uiTab === "DANH_MUC" && canAccessJobs ? (
        <div className="space-y-6" id="dm-unified-catalog">
          {(canViewDanhMuc || isAdmin) && <QuanTriHubWorkQueue onOpen={go} />}
          <QuanTriHubJobCards rows={catalogRows} allowedJobs={allowedJobs} onOpen={go} />
          <div className="app-data-shell min-w-0 p-2">
            <SearchBar
              value={hubSearch}
              onChange={setHubSearch}
              placeholder="Tìm: loại dụng cụ, chức danh, bảng kiểm…"
            />
            {hubSearch.trim() ? (
              <AdvancedDataTable
                columns={columns}
                data={unifiedFlat}
                loading={loading}
                onRowClick={(r) => go(r.path)}
                hideSearch
                tableClassName="w-full min-w-0 table-fixed border-collapse text-left text-sm"
              />
            ) : (
              <p className="px-2 py-3 text-xs text-slate-500">
                Gõ để tìm mọi danh mục, kể cả mục hệ thống (trạm, trạng thái, vai trò).
              </p>
            )}
          </div>
        </div>
      ) : uiTab === "PHAN_QUYEN" && canViewRbac ? (
        <section aria-labelledby="tab-phan-quyen">
          <RBACMatrixView />
        </section>
      ) : uiTab === "IT" && canAccessIt ? (
        <section className="space-y-8" aria-labelledby="tab-danh-cho-it">
          {canViewDanhMuc ? <MdmGovernanceView /> : null}
          <SystemHealthPanel />
        </section>
      ) : null}
    </div>
  );
}
