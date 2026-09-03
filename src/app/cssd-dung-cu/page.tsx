"use client";

/** CSSD vận hành catalog (read-only); CRUD: `/quan-tri-he-thong/danh-muc/dung-cu`. */
import Link from "next/link";
import { History, Layers, AppWindow } from "lucide-react";
import {
  useCssdCatalogPage,
  CSSDCatalogBoTab,
  CSSDCatalogLoaiTab,
} from "@/modules/cssd-erp/contexts/instrument-catalog/entrypoint";
import InventoryHistoryTable from "@/modules/cssd-erp/components/inventory/InventoryHistoryTable";
import SetCompositionCard from "@/modules/cssd-erp/components/inventory/SetCompositionCard";
import SetReconcileCampaignPanel from "@/modules/cssd-erp/components/inventory/SetReconcileCampaignPanel";
import CSSDPageShell from "@/modules/cssd-erp/components/layout/cssd-page-shell";
import { CSSD_UI_TAB_GROUP } from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";
import { CssdHorizTabButton } from "@/modules/cssd-erp/components/layout/CssdHorizTabButton";
import QrScanInput from "@/components/shared/QrScanInput";
import { CssdQrLabelKindsNotice } from "@/modules/cssd-erp/components/catalog/CssdQrLabelKindsNotice";
import { quanTriDungCuHref } from "@/lib/master-data/quan-tri-paths";

const TEXT_ACTION = "text-[11px] font-semibold text-[var(--primary)] hover:underline";
const SEARCH_INPUT =
  "bv103-control-h w-full touch-manipulation rounded-[var(--radius-control)] border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/15";
const SEARCH_CAMERA =
  "bv103-control-h inline-flex shrink-0 items-center justify-center gap-1 rounded-[var(--radius-control)] border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50";

export default function Page() {
  const s = useCssdCatalogPage();
  const isCatalogTab = s.tab === "BO" || s.tab === "LOAI";
  const adminFocus = s.tab === "LOAI" ? "loai" : "bo";

  const catalogToolbar = (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
      <QrScanInput
        value={s.q}
        onChange={s.setQ}
        placeholder="Tìm tên, mã hoặc quét QR…"
        cameraTitle="Tìm hoặc quét QR danh mục"
        onEnter={(code) => void s.handleScan(code)}
        onCameraScan={(code) => void s.handleScan(code)}
        className="min-w-[12rem] flex-1"
        inputClassName={SEARCH_INPUT}
        cameraClassName={SEARCH_CAMERA}
      />
      <div className="flex shrink-0 flex-wrap items-center gap-x-3">
        <Link href={quanTriDungCuHref(adminFocus)} className={TEXT_ACTION}>
          Sửa danh mục
        </Link>
        {s.tab === "BO" ? <SetReconcileCampaignPanel /> : null}
        <CssdQrLabelKindsNotice />
      </div>
    </div>
  );

  return (
    <CSSDPageShell title="Dụng cụ CSSD">
      <div className="space-y-3">
        <div className={CSSD_UI_TAB_GROUP}>
          <CssdHorizTabButton active={s.tab === "BO"} onClick={() => s.setTab("BO")} icon={Layers} label="Bộ dụng cụ" mobileLabel="Bộ" />
          <CssdHorizTabButton active={s.tab === "LOAI"} onClick={() => s.setTab("LOAI")} icon={AppWindow} label="Loại dụng cụ" mobileLabel="Loại" />
          <CssdHorizTabButton active={s.tab === "HISTORY"} onClick={() => s.setTab("HISTORY")} icon={History} label="Lịch sử luân chuyển" mobileLabel="Lịch sử" />
        </div>

        {s.loading && isCatalogTab ? (
          <p className="px-2.5 py-3 text-[11px] text-slate-500">Đang tải danh mục…</p>
        ) : s.tab === "BO" ? (
          <div className="space-y-3">
            <CSSDCatalogBoTab
              boRows={s.boRows}
              selectedBoId={s.selectedBoId}
              setSelectedBoId={s.setSelectedBoId}
              toolbar={catalogToolbar}
            />
            {s.selectedBoId ? (
              <SetCompositionCard boDungCuId={s.selectedBoId} />
            ) : (
              <p className="px-2.5 text-[11px] text-slate-500">Chọn một bộ để xem thành phần.</p>
            )}
          </div>
        ) : s.tab === "LOAI" ? (
          <CSSDCatalogLoaiTab
            catalog={s.catalog}
            loaiRows={s.loaiRows}
            selectedLoaiId={s.selectedLoaiId}
            setSelectedLoaiId={s.setSelectedLoaiId}
            selectedLoai={s.selectedLoai}
            boBySelectedLoai={s.boBySelectedLoai}
            toolbar={catalogToolbar}
          />
        ) : (
          <InventoryHistoryTable />
        )}
      </div>
    </CSSDPageShell>
  );
}
