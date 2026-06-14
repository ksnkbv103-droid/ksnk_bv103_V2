// src/modules/quan-tri-he-thong/bang-kiem/views/BangKiemView.tsx
"use client";

import React, { useState } from "react";
import { ClipboardList } from "lucide-react";
import BangKiemTable from "../components/BangKiemTable";
import BangKiemApDungPanel from "../components/BangKiemApDungPanel";
import TieuChiTable from "../components/TieuChiTable";
import type { DanhMucBangKiem } from "../bang-kiem.types";
import { usePermission } from "@/hooks/usePermission";
import { KsnkPageHeader } from "@/components/shared/KsnkPageShell";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";

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

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      <KsnkPageHeader
        title={
          <span className="inline-flex items-center gap-2 text-[var(--primary)]">
            <ClipboardList size={22} aria-hidden /> Danh mục Bảng kiểm
          </span>
        }
        subtitle="Quản lý mẫu bảng kiểm, quy định phạm vi áp dụng (TGS/KSNK) và tiêu chí — SSOT cho ma trận giám sát."
      />

      <div className="flex flex-col md:flex-row gap-8 items-start relative max-w-[1800px] mx-auto">
        <div className="w-full md:w-[55%] md:sticky md:top-24 space-y-6 max-h-[calc(100vh-140px)] flex flex-col">
          <h2 className={`shrink-0 px-2 ${T.sectionTitle}`}>Mẫu bảng kiểm</h2>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar animate-in fade-in duration-500 pb-10">
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
          </div>
        </div>

        <div className="w-full md:w-[45%] md:sticky md:top-24 space-y-4 max-h-[calc(100vh-140px)] flex flex-col">
          <h2 className={`truncate shrink-0 px-2 ${T.sectionTitle} text-[var(--primary)]`}>
            {selectedBK
              ? `${selectedBK.ma_bk} — ${selectedBK.ten_bang_kiem || selectedBK.ten_bk}`
              : "Chọn bảng kiểm bên trái"}
          </h2>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4 animate-in fade-in slide-in-from-right-6 duration-500 pb-10">
            {selectedBK ? (
              <>
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
                    <h3 className={`px-2 ${T.sectionTitle}`}>
                      Tiêu chí bảng kiểm
                    </h3>
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
                    className={`flex min-h-[200px] flex-col items-center justify-center gap-4 border border-amber-100/90 px-8 text-center text-slate-500 ${bv103LayoutChrome.panelSurface}`}
                  >
                    <p className="text-sm font-semibold text-amber-700">Không có quyền xem tiêu chí</p>
                    <p className="text-sm font-normal text-slate-500 max-w-sm leading-relaxed">
                      Bạn vẫn chỉnh phạm vi áp dụng ở trên. Xem tiêu chí cần quyền BANG_KIEM_DETAIL.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div
                className={`flex h-full min-h-[400px] flex-col items-center justify-center gap-6 border-2 border-dashed border-slate-200/80 text-slate-300 ${bv103LayoutChrome.panelSurface}`}
              >
                <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center text-5xl">📋</div>
                <div className="text-center space-y-2 px-10">
                  <p className="text-sm font-semibold text-slate-500">Chi tiết bảng kiểm</p>
                  <p className="text-sm font-normal text-slate-400 leading-relaxed">
                    Chọn bảng kiểm bên trái để quy định phạm vi áp dụng và xem tiêu chí
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
