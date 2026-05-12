// src/modules/quan-tri-he-thong/bang-kiem/views/BangKiemView.tsx
"use client";

import React, { useState } from "react";
import BangKiemTable from "../components/BangKiemTable";
import TieuChiTable from "../components/TieuChiTable";
import type { DanhMucBangKiem } from "../bang-kiem.types";
import { usePermission } from "@/hooks/usePermission";

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

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#026f17] border-t-transparent" />
      </div>
    );
  }
  if (!bk.view) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-10 text-center font-black uppercase tracking-widest text-slate-400">
        Bạn không có quyền truy cập Danh mục Bảng kiểm
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-8 items-start relative max-w-[1800px] mx-auto px-4">
      {/* Cột trái: Danh mục Bảng kiểm (55%) - Cuộn nội bộ */}
      <div className="w-full md:w-[55%] md:sticky md:top-24 space-y-6 max-h-[calc(100vh-140px)] flex flex-col">
        <div className="flex items-center justify-between px-2 mb-2 shrink-0">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3">
            <span className="w-2 h-8 bg-[#026f17] rounded-full"></span>
            Danh mục Bảng Kiểm
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar animate-in fade-in duration-500 pb-10">
          <BangKiemTable
            onSelectBK={setSelectedBK}
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

      {/* Cột phải: Chi tiết Tiêu chí (45%) - Cuộn nội bộ độc lập */}
      <div className="w-full md:w-[45%] md:sticky md:top-24 space-y-6 max-h-[calc(100vh-140px)] flex flex-col">
        <div className="flex items-center justify-between px-2 mb-2 shrink-0">
          <h2 className="text-xl font-black text-[#026f17] uppercase tracking-tighter truncate">
            {selectedBK ? `Tiêu chí: ${selectedBK.ten_bang_kiem || selectedBK.ten_bk}` : "Chi tiết Tiêu chí"}
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar animate-in fade-in slide-in-from-right-6 duration-500 pb-10">
          {selectedBK ? (
            tc.view ? (
              <TieuChiTable
                bangKiem={selectedBK}
                permission={{
                  import: bk.import && tc.import,
                  create: tc.create,
                  edit: tc.edit,
                  delete: tc.delete,
                }}
              />
            ) : (
              <div className="h-full min-h-[400px] bg-white rounded-[40px] border border-amber-100 flex flex-col items-center justify-center text-slate-500 gap-4 px-8 text-center">
                <p className="text-[11px] font-black uppercase tracking-widest text-amber-700">Không có quyền xem Tiêu chí</p>
                <p className="text-[10px] font-bold text-slate-400 max-w-sm leading-relaxed">
                  Bạn được xem danh mục bảng kiểm nhưng chưa được cấp quyền module Tiêu chí bảng kiểm (BANG_KIEM_DETAIL). Liên hệ quản trị để được cấp quyền VIEW.
                </p>
              </div>
            )
          ) : (
            <div className="h-full min-h-[400px] bg-white rounded-[40px] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300 gap-6 shadow-sm">
              <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center text-5xl">📋</div>
              <div className="text-center space-y-2 px-10">
                <p className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-400">Layer Tiêu Chí</p>
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-relaxed">Chọn bảng kiểm bên trái để nạp danh sách tiêu chí vào đây</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
