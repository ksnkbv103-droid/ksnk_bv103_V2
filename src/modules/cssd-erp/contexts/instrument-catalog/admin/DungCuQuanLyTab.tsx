"use client";

import React, { useState } from "react";
import { BoDungCuPageContent } from "./BoDungCuPage";
import { DungCuLoaiSheet } from "./dung-cu-loai-sheet";
import { useModulePermission } from "@/hooks/useModulePermission";

/** Tab «Quản lý» trên màn Dụng cụ CSSD — chỉ ADMIN (chủ nhiệm khoa): sửa trực tiếp, import/export lô bộ và loại. */
export function DungCuQuanLyTab() {
  const { loading, isAdmin } = useModulePermission("BO_DC");
  const [loaiOpen, setLoaiOpen] = useState(false);

  if (loading) return <p className="px-2.5 py-3 text-[11px] text-slate-500">Đang tải…</p>;
  if (!isAdmin) {
    return <p className="px-1 py-6 text-center text-[11px] text-slate-500">Chỉ chủ nhiệm khoa (ADMIN) quản lý danh mục.</p>;
  }
  return (
    <>
      <BoDungCuPageContent onOpenLoaiSheet={() => setLoaiOpen(true)} />
      {loaiOpen ? <DungCuLoaiSheet onClose={() => setLoaiOpen(false)} /> : null}
    </>
  );
}
