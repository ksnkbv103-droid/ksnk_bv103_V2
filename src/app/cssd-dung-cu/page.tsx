"use client";

/** CSSD vận hành catalog (read-only); CRUD: `/quan-tri-he-thong/danh-muc/dung-cu`. */
import React, { useState } from "react";
import Link from "next/link";
import { History, Layers, AppWindow, ListFilter, ExternalLink, ChevronDown } from "lucide-react";
import {
  useCssdCatalogPage,
  CSSDCatalogBoTab,
  CSSDCatalogLoaiTab,
  CSSDCatalogChiTietTab,
  CSSDCatalogQuickActions,
} from "@/modules/cssd-erp/contexts/instrument-catalog/entrypoint";
import InventoryHistoryTable from "@/modules/cssd-erp/components/inventory/InventoryHistoryTable";
import SetCompositionCard from "@/modules/cssd-erp/components/inventory/SetCompositionCard";
import CSSDPageShell from "@/modules/cssd-erp/components/layout/cssd-page-shell";
import { CSSD_UI_TAB_GROUP } from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";
import { CssdHorizTabButton } from "@/modules/cssd-erp/components/layout/CssdHorizTabButton";
import QrScanInput from "@/components/shared/QrScanInput";
import { CssdQrLabelKindsNotice } from "@/modules/cssd-erp/components/catalog/CssdQrLabelKindsNotice";
import { quanTriDungCuHref } from "@/lib/master-data/quan-tri-paths";

export default function Page() {
  const s = useCssdCatalogPage();
  const [showMore, setShowMore] = useState(false);

  const extraOpen = showMore || s.tab === "CHI_TIET" || s.tab === "LOAI" || s.tab === "HISTORY";
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
        <CssdQrLabelKindsNotice />

        {extraOpen ? (
          <div className={CSSD_UI_TAB_GROUP}>
            <CssdHorizTabButton active={s.tab === "BO"} onClick={() => s.setTab("BO")} icon={Layers} label="Bộ dụng cụ" mobileLabel="Bộ" />
            <CssdHorizTabButton active={s.tab === "CHI_TIET"} onClick={() => s.setTab("CHI_TIET")} icon={ListFilter} label="Dụng cụ chi tiết" mobileLabel="Chi tiết" />
            <CssdHorizTabButton active={s.tab === "LOAI"} onClick={() => s.setTab("LOAI")} icon={AppWindow} label="Loại dụng cụ" mobileLabel="Loại" />
            <CssdHorizTabButton active={s.tab === "HISTORY"} onClick={() => s.setTab("HISTORY")} icon={History} label="Lịch sử luân chuyển" mobileLabel="Lịch sử" />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowMore(true)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
          >
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            Xem thêm danh mục (loại, chi tiết, lịch sử)
          </button>
        )}

        <div className="animate-in fade-in duration-300">
          {isCatalogTab && (
            <div className="mb-4">
              <QrScanInput
                value={s.q}
                onChange={s.setQ}
                placeholder="Tìm tên, mã hoặc quét QR…"
                cameraTitle="Tìm hoặc quét QR danh mục"
                onEnter={(code) => void s.handleScan(code)}
                onCameraScan={(code) => void s.handleScan(code)}
              />
            </div>
          )}

          {s.loading && isCatalogTab ? (
            <div className="rounded-xl border border-slate-100 bg-white p-8 text-center text-slate-500">
              Đang tải danh mục...
            </div>
          ) : s.tab === "BO" ? (
            <div className="space-y-4">
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
              {s.selectedBoId ? (
                <section className="rounded-[var(--radius-shell)] border border-slate-200 bg-white p-4 shadow-sm">
                  <SetCompositionCard boDungCuId={s.selectedBoId} />
                </section>
              ) : null}
            </div>
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

          {isCatalogTab && s.selectedBoId ? (
            <CSSDCatalogQuickActions
              selectedBoId={s.selectedBoId}
              selectedChiTiet={s.selectedChiTiet}
              selectedMaBo={s.selectedBo?.ma_bo || null}
              reload={s.reload}
            />
          ) : null}
        </div>
      </div>
    </CSSDPageShell>
  );
}
