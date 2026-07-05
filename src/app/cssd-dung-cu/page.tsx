"use client";

/** CSSD vận hành catalog (read-only); CRUD: `/quan-tri-he-thong/danh-muc/dung-cu`. */
import React from "react";
import { History, Layers, AppWindow, ListFilter, QrCode } from "lucide-react";
import {
  useCssdCatalogPage,
  CSSDCatalogBoTab,
  CSSDCatalogLoaiTab,
  CSSDCatalogChiTietTab,
  CSSDCatalogQuickActions,
} from "@/modules/cssd-erp/contexts/instrument-catalog/entrypoint";
import CssdCatalogMdmBanner from "@/modules/cssd-erp/components/catalog/CssdCatalogMdmBanner";
import InventoryHistoryTable from "@/modules/cssd-erp/components/inventory/InventoryHistoryTable";
import CSSDPageShell from "@/modules/cssd-erp/components/layout/cssd-page-shell";
import { CSSD_UI_TAB_GROUP } from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";
import { CssdHorizTabButton } from "@/modules/cssd-erp/components/layout/CssdHorizTabButton";
import QrCameraButton from "@/components/shared/QrCameraButton";

export default function Page() {
  const s = useCssdCatalogPage();

  const isCatalogTab = s.tab === "BO" || s.tab === "CHI_TIET" || s.tab === "LOAI";

  return (
    <CSSDPageShell
      title={
        <>
          Dụng cụ phẫn thuật &amp; thủ thuật <span className="text-[var(--primary)]">CSSD</span>
        </>
      }
      subtitle="Xem danh mục bộ, loại, chi tiết; quét QR; lịch sử luân chuyển. Chỉnh master data tại Quản trị."
    >
      <div className="space-y-4 sm:space-y-6">
        {isCatalogTab ? <CssdCatalogMdmBanner /> : null}

        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4">
          <div className={CSSD_UI_TAB_GROUP}>
            <CssdHorizTabButton active={s.tab === "BO"} onClick={() => s.setTab("BO")} icon={Layers} label="Bộ dụng cụ" mobileLabel="Bộ" />
            <CssdHorizTabButton active={s.tab === "CHI_TIET"} onClick={() => s.setTab("CHI_TIET")} icon={ListFilter} label="Dụng cụ chi tiết" mobileLabel="Chi tiết" />
            <CssdHorizTabButton active={s.tab === "LOAI"} onClick={() => s.setTab("LOAI")} icon={AppWindow} label="Loại dụng cụ" mobileLabel="Loại" />
            <CssdHorizTabButton active={s.tab === "HISTORY"} onClick={() => s.setTab("HISTORY")} icon={History} label="Lịch sử luân chuyển" mobileLabel="Lịch sử" />
          </div>
        </div>

        <div className="animate-in fade-in duration-300">
          {isCatalogTab && (
            <div className="mb-6 space-y-4">
              <div className="relative flex items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <input
                    value={s.q}
                    onChange={(e) => s.setQ(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void s.handleScan(s.q);
                      }
                    }}
                    placeholder="Tìm kiếm danh mục hoặc quét mã QR bộ/quy trình (nhấn Enter)..."
                    className="h-12 w-full rounded-xl border border-slate-200 pl-11 pr-4 text-sm font-medium outline-none transition-all placeholder:text-slate-400 focus:ring-2 focus:ring-[var(--primary)]/20"
                  />
                  <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <QrCode size={18} className="text-[var(--primary)]" />
                  </div>
                </div>
                <QrCameraButton
                  onScan={(code) => {
                    s.setQ(code);
                    void s.handleScan(code);
                  }}
                  title="Quét QR danh mục dụng cụ"
                />
              </div>
            </div>
          )}

          {s.loading && isCatalogTab ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-slate-500">
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
              reload={s.reload}
            />
          )}
        </div>
      </div>
    </CSSDPageShell>
  );
}
