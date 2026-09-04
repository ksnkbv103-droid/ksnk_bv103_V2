// src/modules/quan-tri-he-thong/bang-kiem/views/BangKiemView.tsx
"use client";

import React, { useState } from "react";
import BangKiemTable from "../components/BangKiemTable";
import BangKiemApDungPanel from "../components/BangKiemApDungPanel";
import TieuChiTable from "../components/TieuChiTable";
import type { DanhMucBangKiem } from "../bang-kiem.types";
import { usePermission } from "@/hooks/usePermission";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export default function BangKiemView() {
  const { loading, canView, canCreate, canEdit, canDelete, canImport } = usePermission();
  const bk = {
    view: canView("BANG_KIEM"),
    create: canCreate("BANG_KIEM"),
    edit: canEdit("BANG_KIEM"),
    delete: canDelete("BANG_KIEM"),
    import: canImport("BANG_KIEM"),
  };
  const tc = {
    view: canView("BANG_KIEM_DETAIL"),
    create: canCreate("BANG_KIEM_DETAIL"),
    edit: canEdit("BANG_KIEM_DETAIL"),
    delete: canDelete("BANG_KIEM_DETAIL"),
    import: canImport("BANG_KIEM_DETAIL"),
  };
  const [selectedBK, setSelectedBK] = useState<DanhMucBangKiem | null>(null);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }
  if (!bk.view) {
    return (
      <div
        className={`mx-auto max-w-xl p-10 text-center text-sm font-medium text-slate-500 ${bv103LayoutChrome.panelSurface}`}
      >
        Bạn không có quyền truy cập Danh mục Bảng kiểm
      </div>
    );
  }

  const detailTitle = selectedBK
    ? `${selectedBK.ma_bk} — ${selectedBK.ten_bang_kiem || selectedBK.ten_bk}`
    : "Chi tiết bảng kiểm";

  return (
    <div className="bv103-stack-page space-y-3 pb-10 animate-in fade-in duration-500">
      <h2 className={`px-2 ${T.sectionTitle}`}>Mẫu bảng kiểm</h2>

      <BangKiemTable
        onSelectBK={setSelectedBK}
        onDataLoaded={(rows) => {
          if (!selectedBK?.id) return;
          const fresh = rows.find((r) => r.id === selectedBK.id);
          if (fresh) setSelectedBK(fresh);
        }}
        refreshToken={tableRefreshKey}
        selectedBKId={selectedBK?.id}
        permission={{
          import: bk.import,
          create: bk.create,
          edit: bk.edit,
          delete: bk.delete,
        }}
      />

      {!selectedBK ? (
        <p className="px-2 text-[11px] text-slate-500">
          Chọn một dòng để xem phạm vi áp dụng và tiêu chí.
        </p>
      ) : null}

      <Dialog
        open={Boolean(selectedBK)}
        onOpenChange={(open) => {
          if (!open) setSelectedBK(null);
        }}
      >
        <DialogContent className="flex max-h-[min(90dvh,880px)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
          <DialogTitle className="sr-only">{detailTitle}</DialogTitle>
          {selectedBK ? (
            <div className="min-h-0 flex-1 space-y-[var(--bv103-space-3)] overflow-y-auto overscroll-contain px-5 py-5 pr-12 sm:px-6 sm:pr-14">
              <h2 className={`truncate px-1 ${T.sectionTitle} text-[var(--primary)]`}>
                {detailTitle}
              </h2>
              <BangKiemApDungPanel
                bangKiem={selectedBK}
                canEdit={bk.edit}
                onSaved={(apDung) => {
                  setSelectedBK((prev) => (prev ? { ...prev, ap_dung_jsonb: apDung } : prev));
                  setTableRefreshKey((k) => k + 1);
                }}
              />
              {tc.view ? (
                <div className="space-y-2">
                  <h3 className={`px-1 ${T.sectionTitle}`}>Tiêu chí bảng kiểm</h3>
                  <TieuChiTable
                    bangKiem={selectedBK}
                    permission={{
                      import: bk.import && tc.import,
                      create: tc.create,
                      edit: tc.edit,
                      delete: tc.delete,
                    }}
                  />
                </div>
              ) : (
                <div
                  className={`flex min-h-[160px] flex-col items-center justify-center gap-3 border border-amber-100/90 px-6 text-center text-slate-500 ${bv103LayoutChrome.panelSurface}`}
                >
                  <p className="text-sm font-semibold text-amber-700">Không có quyền xem tiêu chí</p>
                  <p className="max-w-sm text-sm font-normal leading-relaxed text-slate-500">
                    Bạn vẫn chỉnh phạm vi áp dụng ở trên. Xem tiêu chí cần quyền BANG_KIEM_DETAIL.
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
