"use client";

import React from "react";
import CSSDPageShell from "../components/layout/cssd-page-shell";
import CSSDSubNav from "../components/navigation/CSSDSubNav";
import DungCuChiTietFormModal from "@/modules/quan-tri-he-thong/danh-muc/dung-cu/dung-cu-chi-tiet-form-modal";
import { useCssdCatalogPage } from "../hooks/use-cssd-catalog-page";
import type { CatalogTab } from "./cssd-catalog-page-helpers";
import { CSSDCatalogBoTab } from "./CSSDCatalogBoTab";
import { CSSDCatalogChiTietTab } from "./CSSDCatalogChiTietTab";
import { CSSDCatalogHoaChatTab } from "./CSSDCatalogHoaChatTab";
import { CSSDCatalogLoaiTab } from "./CSSDCatalogLoaiTab";
import { CSSDCatalogQuickActions } from "./CSSDCatalogQuickActions";

const TABS: readonly CatalogTab[] = ["BO", "CHI_TIET", "LOAI", "HOA_CHAT"] as const;

export default function CSSDCatalogPage() {
  const s = useCssdCatalogPage();

  return (
    <CSSDPageShell
      title={<span className="text-[#026f17]">Danh mục CSSD liên thông</span>}
      subtitle="Bộ dụng cụ ↔ Dụng cụ chi tiết ↔ Loại dụng cụ: chọn một điểm, thấy ngay liên kết liên quan."
    >
      <CSSDSubNav />
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-4">
          <input
            value={s.q}
            onChange={(e) => s.setQ(e.target.value)}
            placeholder="Tìm mã/tên bộ, mã/tên dụng cụ chi tiết, mã/tên loại..."
            className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#026f17]/20"
          />
        </div>
        <div className="flex w-fit flex-wrap gap-2 rounded-2xl border border-slate-100/80 bg-slate-100 p-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => s.setTab(t)}
              className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all ${s.tab === t ? "bg-[#026f17] text-[#FFD700] shadow-md" : "text-slate-500"}`}
            >
              {t === "BO"
                ? "Bộ dụng cụ"
                : t === "CHI_TIET"
                  ? "Dụng cụ chi tiết"
                  : t === "LOAI"
                    ? "Loại dụng cụ"
                    : "Hóa chất vật tư"}
            </button>
          ))}
        </div>

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
        ) : s.tab === "LOAI" ? (
          <CSSDCatalogLoaiTab
            loaiRows={s.loaiRows}
            selectedLoaiId={s.selectedLoaiId}
            setSelectedLoaiId={s.setSelectedLoaiId}
            selectedLoai={s.selectedLoai}
            boBySelectedLoai={s.boBySelectedLoai}
          />
        ) : (
          <CSSDCatalogHoaChatTab hoaChatRows={s.hoaChatRows} />
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
    </CSSDPageShell>
  );
}
