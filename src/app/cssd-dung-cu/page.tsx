"use client";

/** CSSD vận hành catalog (read-only); CRUD: `/quan-tri-he-thong/danh-muc/dung-cu`. */
import React from "react";
import Link from "next/link";
import { History, Layers, AppWindow, ListFilter, QrCode, ExternalLink } from "lucide-react";
import {
  useCssdCatalogPage,
  CSSDCatalogBoTab,
  CSSDCatalogLoaiTab,
  CSSDCatalogChiTietTab,
  CSSDCatalogQuickActions,
} from "@/modules/cssd-erp/contexts/instrument-catalog/entrypoint";
import InventoryHistoryTable from "@/modules/cssd-erp/components/inventory/InventoryHistoryTable";
import CSSDPageShell from "@/modules/cssd-erp/components/layout/cssd-page-shell";
import { CSSD_UI_TAB_GROUP } from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";
import { CssdHorizTabButton } from "@/modules/cssd-erp/components/layout/CssdHorizTabButton";
import QrScanInput from "@/components/shared/QrScanInput";
import { quanTriDungCuHref } from "@/lib/master-data/quan-tri-paths";

export default function Page() {
  const s = useCssdCatalogPage();

  const isCatalogTab = s.tab === "BO" || s.tab === "CHI_TIET" || s.tab === "LOAI";
  const adminFocus = s.tab === "LOAI" ? "loai" : s.tab === "CHI_TIET" ? "chi-tiet" : "bo";

  return (
    <CSSDPageShell
      title="Dụng cụ CSSD"
      actions={
        isCatalogTab ? (
          <Link
            href={quanTriDungCuHref(adminFocus)}
            className="bv103-control-h inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--primary)]/30 bg-white px-2.5 text-xs font-semibold text-[var(--primary)] hover:bg-emerald-50"
          >
            Sửa tại Quản trị
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </Link>
        ) : null
      }
    >
      <div className="space-y-3 sm:space-y-4">
        <div className={CSSD_UI_TAB_GROUP}>
          <CssdHorizTabButton active={s.tab === "BO"} onClick={() => s.setTab("BO")} icon={Layers} label="Bộ dụng cụ" mobileLabel="Bộ" />
          <CssdHorizTabButton active={s.tab === "CHI_TIET"} onClick={() => s.setTab("CHI_TIET")} icon={ListFilter} label="Dụng cụ chi tiết" mobileLabel="Chi tiết" />
          <CssdHorizTabButton active={s.tab === "LOAI"} onClick={() => s.setTab("LOAI")} icon={AppWindow} label="Loại dụng cụ" mobileLabel="Loại" />
          <CssdHorizTabButton active={s.tab === "HISTORY"} onClick={() => s.setTab("HISTORY")} icon={History} label="Lịch sử luân chuyển" mobileLabel="Lịch sử" />
        </div>

        <div className="animate-in fade-in duration-300">
          {isCatalogTab && (
            <div className="mb-4 space-y-2">
              <div className="relative min-w-0">
                <input
                  value={s.q}
                  onChange={(e) => s.setQ(e.target.value)}
                  placeholder="Lọc theo tên / mã…"
                  className="bv103-control-h w-full rounded-[var(--radius-control)] border border-slate-200 pl-10 pr-3 text-sm font-medium outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-[var(--primary)]/20"
                />
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <QrCode size={16} className="text-[var(--primary)]" />
                </div>
              </div>
              <QrScanInput
                placeholder="Quét QR bộ / chu trình…"
                cameraTitle="Quét QR danh mục dụng cụ"
                onEnter={(code) => {
                  s.setQ(code);
                  void s.handleScan(code);
                }}
                onCameraScan={(code) => {
                  s.setQ(code);
                  void s.handleScan(code);
                }}
              />
            </div>
          )}

          {s.loading && isCatalogTab ? (
            <div className="rounded-xl border border-slate-100 bg-white p-8 text-center text-slate-500">
              Đang tải danh mục...
            </div>
          ) : s.tab === "BO" ? (
            <CSSDCatalogBoTab
              boRows={s.boRows}
              chiTietBySelectedBo={s.chiTietBySelectedBo}
              selectedBoId={s.selectedBoId}
              setSelectedBoId={s.setSelectedBoId}
              selectedBo={s.selectedBo}
              setSelectedChiTietId={s.setSelectedChiTietId}
              setSelectedLoaiId={s.setSelectedLoaiId}
              setTab={s.setTab}
            />
          ) : s.tab === "CHI_TIET" ? (
            <CSSDCatalogChiTietTab
              catalog={s.catalog}
              chiTietRows={s.chiTietRows}
              selectedChiTietId={s.selectedChiTietId}
              setSelectedChiTietId={s.setSelectedChiTietId}
              setSelectedLoaiId={s.setSelectedLoaiId}
              selectedChiTiet={s.selectedChiTiet}
              boBySelectedChiTietLoai={s.boBySelectedChiTietLoai}
            />
          ) : s.tab === "LOAI" ? (
            <CSSDCatalogLoaiTab
              catalog={s.catalog}
              loaiRows={s.loaiRows}
              selectedLoaiId={s.selectedLoaiId}
              setSelectedLoaiId={s.setSelectedLoaiId}
              selectedLoai={s.selectedLoai}
              boBySelectedLoai={s.boBySelectedLoai}
            />
          ) : s.tab === "HISTORY" ? (
            <InventoryHistoryTable />
          ) : null}

          {isCatalogTab && (
            <CSSDCatalogQuickActions
              selectedBoId={s.selectedBoId}
              selectedChiTiet={s.selectedChiTiet}
              selectedMaBo={s.selectedBo?.ma_bo || null}
              reload={s.reload}
            />
          )}
        </div>
      </div>
    </CSSDPageShell>
  );
}
