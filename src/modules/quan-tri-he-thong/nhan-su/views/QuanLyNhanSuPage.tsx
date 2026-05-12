"use client";

import React from "react";
import NhanSuTable from "../components/NhanSuTable";
import { useModulePermission } from "@/hooks/useModulePermission";

const MODULE_KEY = "NHAN_SU";

export default function QuanLyNhanSuPage() {
  const { loading, allowed } = useModulePermission(MODULE_KEY);
  const canViewNhanSu = allowed.view;

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#026f17] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!canViewNhanSu) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-400 font-black uppercase tracking-widest text-sm">
        Bạn không có quyền truy cập module Nhân sự
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Module Title */}
      <div className="flex justify-between items-center bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👥</span>
            <h1 className="text-3xl font-black text-[#026f17] uppercase tracking-tighter">
              Hồ sơ Nhân sự
            </h1>
          </div>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest ml-11">
            Quản lý danh sách và phân bổ nhân lực toàn viện
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full">
        <NhanSuTable
          permission={{
            import: allowed.import,
            create: allowed.create,
            edit: allowed.edit,
            delete: allowed.delete,
          }}
        />
      </div>
    </div>
  );
}
