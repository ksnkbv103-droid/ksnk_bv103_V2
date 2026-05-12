"use client";

import React from "react";
import QuanTriDanhMucPage from "./QuanTriDanhMucPage";
import { useModulePermission } from "@/hooks/useModulePermission";

const MODULE_KEY = "DANH_MUC";

export default function DanhMucPage() {
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
    return <div className="p-10 text-center text-slate-400 font-black uppercase tracking-widest">Không có quyền truy cập module danh mục</div>;
  }

  return (
    <div className="space-y-4">
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
        {canManage ? "Danh mục ở chế độ quản trị" : "Danh mục ở chế độ chỉ xem"}
      </div>
      {/* Giữ nguyên toàn bộ logic nghiệp vụ của màn hình danh mục gốc */}
      <QuanTriDanhMucPage />
    </div>
  );
}
