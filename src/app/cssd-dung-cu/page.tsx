"use client";

/** Dụng cụ: 3 tab Bộ · Loại và kho · Phiếu; Luân chuyển mở từ panel bộ. Hỏng/Mất ở /cssd-su-co. */
import { Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ClipboardList, Layers, Tag } from "lucide-react";
import { useCssdCatalogPage } from "@/modules/cssd-erp/contexts/instrument-catalog/entrypoint";
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
import {
  CatalogDeNghiCartProvider,
  CatalogDeNghiCartBar,
} from "@/modules/cssd-erp/components/catalog/CatalogDeNghiCart";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";

/** Lazy per active tab — keep shell/toolbar light (Perf P1 / W5). */
function TabPanelSkeleton() {
  return (
    <div className="flex h-[40vh] items-center justify-center" aria-busy="true">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--primary)]" />
    </div>
  );
}

const panelFallback = <TabPanelSkeleton />;

const CSSDCatalogBoTab = dynamic(
  () =>
    import("@/modules/cssd-erp/views/CSSDCatalogBoTab").then((m) => ({
      default: m.CSSDCatalogBoTab,
    })),
  { loading: () => panelFallback },
);

const CSSDCatalogLoaiTab = dynamic(
  () =>
    import("@/modules/cssd-erp/views/CSSDCatalogLoaiTab").then((m) => ({
      default: m.CSSDCatalogLoaiTab,
    })),
  { loading: () => panelFallback },
);

const CSSDCatalogDeNghiTab = dynamic(
  () =>
    import("@/modules/cssd-erp/views/CSSDCatalogDeNghiTab").then((m) => ({
      default: m.CSSDCatalogDeNghiTab,
    })),
  { loading: () => panelFallback },
);

const CSSDCatalogLuanChuyenTab = dynamic(
  () =>
    import("@/modules/cssd-erp/views/CSSDCatalogLuanChuyenTab").then((m) => ({
      default: m.CSSDCatalogLuanChuyenTab,
    })),
  { loading: () => panelFallback },
);

const SetCompositionCard = dynamic(
  () => import("@/modules/cssd-erp/components/inventory/SetCompositionCard"),
  { loading: () => <p className="py-6 text-center text-sm text-slate-500">Đang tải thành phần…</p> },
);

const SetReconcileCampaignPanel = dynamic(
  () => import("@/modules/cssd-erp/components/inventory/SetReconcileCampaignPanel"),
);

function CssdDungCuPageInner() {
  const s = useCssdCatalogPage();
  const router = useRouter();
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
          Chọn một <span className="font-semibold text-slate-700">bộ</span> để xem thành phần, in danh mục hoặc
          luân chuyển. <span className="font-semibold text-slate-700">Loại và kho</span> cho biết tồn chưa dùng.{" "}
          <span className="font-semibold text-slate-700">Phiếu</span> xem Cũ → Mới và in.{" "}
          <Link href="/cssd-su-co?group=INSTRUMENT" className="font-semibold text-[var(--primary)] hover:underline">
            Hỏng/Mất
          </Link>
          {" chỉ tại Sự cố."}
        </p>

        <div className={CSSD_UI_TAB_GROUP} role="tablist" aria-label="Dụng cụ">
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
            label="Loại và kho"
            mobileLabel="Loại"
          />
          <CssdHorizTabButton
            active={s.tab === "DE_NGHI"}
            onClick={() => s.setTab("DE_NGHI")}
            icon={ClipboardList}
            label="Phiếu"
            mobileLabel="Phiếu"
          />
        </div>
        {s.tab === "LUAN_CHUYEN" ? (
          <button
            type="button"
            className="px-1 text-[11px] font-semibold text-[var(--primary)] hover:underline"
            onClick={() => s.setTab("BO")}
          >
            ← Về danh sách bộ
          </button>
        ) : null}

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
            {s.selectedBoId ? (
              <div className="space-y-1">
                <div className="flex justify-end px-1">
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-slate-500 hover:underline"
                    onClick={() => s.setSelectedBoId(null)}
                  >
                    Đóng thành phần
                  </button>
                </div>
                <SetCompositionCard
                  boDungCuId={s.selectedBoId}
                  onTransfer={(ma) => router.push(`/cssd-dung-cu?tab=LUAN_CHUYEN&ma=${encodeURIComponent(ma)}`)}
                />
              </div>
            ) : null}
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
        ) : null}
        <CatalogDeNghiCartBar />
      </div>
    </CSSDPageShell>
    </CatalogDeNghiCartProvider>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[40vh] items-center justify-center" aria-busy="true">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--primary)]" />
        </div>
      }
    >
      <CssdDungCuPageInner />
    </Suspense>
  );
}
