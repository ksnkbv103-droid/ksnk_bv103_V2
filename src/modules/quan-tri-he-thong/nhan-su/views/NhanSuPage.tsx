"use client";

import React, { useState } from "react";
import NhanSuTable from "../components/NhanSuTable";
import { useModulePermission } from "@/hooks/useModulePermission";

const MODULE_KEY = "NHAN_SU";

export default function NhanSuPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { loading, allowed } = useModulePermission(MODULE_KEY);
  const canAccess = allowed.view;
  const canManage = allowed.manage;

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#026f17] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!canAccess) {
    return <div className="p-10 text-center text-slate-400 font-black uppercase tracking-widest">Không có quyền truy cập module nhân sự</div>;
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-[#026f17] uppercase tracking-tighter">Quản lý Hồ sơ Nhân sự</h1>
          <p className="text-slate-500 font-medium text-sm">Giám sát thông tin, chức vụ và phân bổ nhân lực toàn bệnh viện</p>
        </div>
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{canManage ? "Có quyền chỉnh sửa dữ liệu" : "Chế độ chỉ xem"}</div>
      </div>
      {/* Bảng dữ liệu dùng chung của module nhân sự */}
      <NhanSuTable
        refreshKey={refreshKey}
        permission={{
          import: allowed.import,
          create: allowed.create,
          edit: allowed.edit,
          delete: allowed.delete,
        }}
      />
      <button className="hidden" onClick={() => setRefreshKey((prev) => prev + 1)} />
    </div>
  );
}
