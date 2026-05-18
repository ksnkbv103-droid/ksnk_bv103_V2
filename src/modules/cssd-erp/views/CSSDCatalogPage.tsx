"use client";

import React from "react";
import CSSDPageShell from "../components/layout/cssd-page-shell";
import DungCuChiTietFormModal from "@/modules/quan-tri-he-thong/danh-muc/dung-cu/dung-cu-chi-tiet-form-modal";
import { useCssdCatalogPage } from "../hooks/use-cssd-catalog-page";
import type { CatalogTab } from "./cssd-catalog-page-helpers";
import { CSSDCatalogBoTab } from "./CSSDCatalogBoTab";
import { CSSDCatalogChiTietTab } from "./CSSDCatalogChiTietTab";
import { CSSDCatalogHoaChatTab } from "./CSSDCatalogHoaChatTab";
import { CSSDCatalogLoaiTab } from "./CSSDCatalogLoaiTab";
import { CSSDCatalogQuickActions } from "./CSSDCatalogQuickActions";
import { CSSD_UI_TAB_ACTIVE, CSSD_UI_TAB_GROUP, CSSD_UI_TAB_IDLE } from "../shared/ui/cssd-ui-chrome";

const TABS: readonly CatalogTab[] = ["BO", "CHI_TIET", "LOAI"] as const;

export default function CSSDCatalogPage({ suppressShell = false }: { suppressShell?: boolean } = {}) {
  const s = useCssdCatalogPage();
  const statItems = [
    { label: "Bộ dụng cụ", value: s.boRows.length },
    { label: "Dụng cụ chi tiết", value: s.chiTietRows.length },
    { label: "Loại dụng cụ", value: s.loaiRows.length },
  ];

  const mainContent = (
    <>
      <div className="space-y-4 animate-in fade-in duration-500">
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <input
            value={s.q}
            onChange={(e) => s.setQ(e.target.value)}
            placeholder="Tìm mã/tên bộ, mã/tên dụng cụ chi tiết, mã/tên loại..."
            className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#026f17]/20"
          />
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => s.setTab(t)}
                className={`rounded-lg px-5 py-2 text-xs font-semibold transition-all ${s.tab === t ? CSSD_UI_TAB_ACTIVE : CSSD_UI_TAB_IDLE}`}
              >
                {t === "BO"
                  ? "Bộ dụng cụ"
                  : t === "CHI_TIET"
                    ? "Dụng cụ chi tiết"
                    : "Loại dụng cụ"}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {statItems.map((item) => (
              <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                <p className="text-base font-bold text-slate-800">{item.value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Đang chọn:{" "}
            <span className="font-semibold text-slate-700">
              {s.selectedBo?.ten_bo || s.selectedChiTiet?.ten_chi_tiet || s.selectedLoai?.ten_loai_dung_cu || "chưa chọn bản ghi"}
            </span>
          </p>
        </section>

        {s.loading ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-slate-500">Đang tải danh mục...</div>
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
        ) : (
          <CSSDCatalogLoaiTab
            loaiRows={s.loaiRows}
            selectedLoaiId={s.selectedLoaiId}
            setSelectedLoaiId={s.setSelectedLoaiId}
            selectedLoai={s.selectedLoai}
            boBySelectedLoai={s.boBySelectedLoai}
          />
        )}

        <CSSDCatalogQuickActions
          selectedBoId={s.selectedBoId}
          selectedChiTiet={s.selectedChiTiet}
          setEditing={s.setEditing}
          setModalOpen={s.setModalOpen}
          reload={s.reload}
        />
      </div>

      <DungCuChiTietFormModal
        key={s.editing?.id || "cssd-catalog-create"}
        open={s.modalOpen}
        initialRow={s.editing}
        presetBoId={s.editing ? undefined : s.selectedBoId}
        presetLoaiId={s.editing ? undefined : s.selectedLoaiId}
        boOptions={s.catalog.bo.map((x) => ({ id: x.id, ma_bo: x.ma_bo, ten_bo: x.ten_bo }))}
        loaiOptions={s.catalog.loai.map((x) => ({ id: x.id, ma_danh_muc: x.ma_loai_dung_cu, ten_danh_muc: x.ten_loai_dung_cu }))}
        loadingBo={false}
        loadingLoai={false}
        onClose={() => {
          s.setModalOpen(false);
          s.setEditing(null);
        }}
        onSaved={() => {
          s.setModalOpen(false);
          s.setEditing(null);
          void s.reload();
        }}
      />
    </>
  );

  if (suppressShell) {
    return mainContent;
  }

  return (
    <CSSDPageShell
      title={<span className="text-[#026f17]">Danh mục CSSD liên thông</span>}
      subtitle="Bộ dụng cụ ↔ Dụng cụ chi tiết ↔ Loại dụng cụ: chọn một điểm, thấy ngay liên kết liên quan."
    >
      {mainContent}
    </CSSDPageShell>
  );
}
