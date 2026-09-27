"use client";

/** Dụng cụ: đề nghị danh mục và luân chuyển số lượng. Hỏng/Mất ở /cssd-su-co. */
import Link from "next/link";
import { ArrowLeftRight, ClipboardList, History, Layers, Tag } from "lucide-react";
import {
  useCssdCatalogPage,
  CSSDCatalogBoTab,
  CSSDCatalogLoaiTab,
  CSSDCatalogDeNghiTab,
  CSSDCatalogLuanChuyenTab,
} from "@/modules/cssd-erp/contexts/instrument-catalog/entrypoint";
import InventoryHistoryTable from "@/modules/cssd-erp/components/inventory/InventoryHistoryTable";
import SetCompositionCard from "@/modules/cssd-erp/components/inventory/SetCompositionCard";
import SetReconcileCampaignPanel from "@/modules/cssd-erp/components/inventory/SetReconcileCampaignPanel";
import CSSDPageShell from "@/modules/cssd-erp/components/layout/cssd-page-shell";
import {
  CSSD_UI_TAB_GROUP,
  CSSD_UI_TOOLBAR_PRIMARY,
  CSSD_UI_TOOLBAR_QUIET,
  CSSD_UI_TOOLBAR_ROW,
  CSSD_UI_LINK_QUIET,
  CSSD_UI_ACTION_SECONDARY,
} from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";
import { CssdHorizTabButton } from "@/modules/cssd-erp/components/layout/CssdHorizTabButton";
import QrScanInput from "@/components/shared/QrScanInput";
import { CssdQrLabelKindsNotice } from "@/modules/cssd-erp/components/catalog/CssdQrLabelKindsNotice";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  CatalogDeNghiCartProvider,
  CatalogDeNghiCartBar,
} from "@/modules/cssd-erp/components/catalog/CatalogDeNghiCart";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";

export default function Page() {
  const s = useCssdCatalogPage();
  const isCatalogTab = s.tab === "BO" || s.tab === "LOAI";

  const catalogToolbar = (
    <div className={CSSD_UI_TOOLBAR_ROW}>
      <div className={CSSD_UI_TOOLBAR_PRIMARY}>
        <QrScanInput
          value={s.q}
          onChange={s.setQ}
          placeholder="Tìm tên, mã hoặc quét QR…"
          cameraTitle="Tìm hoặc quét QR danh mục"
          onEnter={(code) => void s.handleScan(code)}
          onCameraScan={(code) => void s.handleScan(code)}
          className="min-w-[12rem] flex-1"
          inputClassName={bv103LayoutChrome.controlInput}
          cameraClassName={`${CSSD_UI_ACTION_SECONDARY} px-2.5 text-[11px]`}
        />
      </div>
      <div className={CSSD_UI_TOOLBAR_QUIET} aria-label="Liên kết phụ">
        <Link href="/cssd-dung-cu?tab=DE_NGHI" className={CSSD_UI_LINK_QUIET}>
          Xem phiếu đề nghị
        </Link>
        {s.tab === "BO" ? <SetReconcileCampaignPanel /> : null}
        <CssdQrLabelKindsNotice />
      </div>
    </div>
  );

  return (
    <CatalogDeNghiCartProvider>
    <CSSDPageShell title="Dụng cụ CSSD">
      <div className="space-y-3">
        <p className="px-1 text-[11px] leading-relaxed text-slate-500">
          <span className="font-semibold text-slate-700">Đề nghị danh mục</span>
          {" — tạo hoặc sửa chuẩn Loại, Bộ, Thành phần. "}
          <span className="font-semibold text-slate-700">Luân chuyển</span>
          {" — chuyển số lượng kho ↔ bộ hoặc bộ ↔ bộ. "}
          <Link href="/cssd-su-co?group=INSTRUMENT" className="font-semibold text-[var(--primary)] hover:underline">
            Hỏng/Mất và sự cố
          </Link>
          {" — chỉ tại Sự cố."}
        </p>
        <div className={CSSD_UI_TAB_GROUP}>
          <CssdHorizTabButton
            active={s.tab === "BO"}
            onClick={() => s.setTab("BO")}
            icon={Layers}
            label="Bộ dụng cụ"
            mobileLabel="Bộ"
          />
          <CssdHorizTabButton
            active={s.tab === "LOAI"}
            onClick={() => s.setTab("LOAI")}
            icon={Tag}
            label="Loại dụng cụ"
            mobileLabel="Loại"
          />
          <CssdHorizTabButton
            active={s.tab === "DE_NGHI"}
            onClick={() => s.setTab("DE_NGHI")}
            icon={ClipboardList}
            label="Đề nghị danh mục"
            mobileLabel="Đề nghị"
          />
          <CssdHorizTabButton
            active={s.tab === "LUAN_CHUYEN"}
            onClick={() => s.setTab("LUAN_CHUYEN")}
            icon={ArrowLeftRight}
            label="Luân chuyển"
            mobileLabel="Chuyển"
          />
          <CssdHorizTabButton
            active={s.tab === "HISTORY"}
            onClick={() => s.setTab("HISTORY")}
            icon={History}
            label="Lịch sử kho"
            mobileLabel="Kho"
          />
        </div>

        {s.loading && isCatalogTab ? (
          <p className="px-2.5 py-3 text-[11px] text-slate-500">Đang tải danh mục…</p>
        ) : s.tab === "BO" ? (
          <div className="space-y-2">
            <CSSDCatalogBoTab
              boRows={s.boRows}
              selectedBoId={s.selectedBoId}
              setSelectedBoId={s.setSelectedBoId}
              toolbar={catalogToolbar}
            />
            {!s.selectedBoId ? (
              <p className="px-2.5 text-[11px] text-slate-500">Chọn một bộ để xem thành phần.</p>
            ) : null}
            <Dialog
              open={Boolean(s.selectedBoId)}
              onOpenChange={(open) => {
                if (!open) s.setSelectedBoId(null);
              }}
            >
              <DialogContent className="max-w-3xl sm:max-w-4xl max-h-[min(90dvh,880px)] overflow-y-auto">
                <DialogTitle className="sr-only">Thành phần bộ dụng cụ</DialogTitle>
                {s.selectedBoId ? (
                  <SetCompositionCard boDungCuId={s.selectedBoId} />
                ) : null}
              </DialogContent>
            </Dialog>
          </div>
        ) : s.tab === "LOAI" ? (
          <div className="space-y-2">
            <CSSDCatalogLoaiTab
              catalog={s.catalog}
              loaiRows={s.loaiRows}
              selectedLoaiId={s.selectedLoaiId}
              setSelectedLoaiId={s.setSelectedLoaiId}
              selectedLoai={s.selectedLoai}
              boBySelectedLoai={s.boBySelectedLoai}
              toolbar={catalogToolbar}
            />
          </div>
        ) : s.tab === "DE_NGHI" ? (
          <CSSDCatalogDeNghiTab />
        ) : s.tab === "LUAN_CHUYEN" ? (
          <CSSDCatalogLuanChuyenTab onSubmitted={() => void s.reload()} />
        ) : (
          <InventoryHistoryTable />
        )}
        <CatalogDeNghiCartBar />
      </div>
    </CSSDPageShell>
    </CatalogDeNghiCartProvider>
  );
}
