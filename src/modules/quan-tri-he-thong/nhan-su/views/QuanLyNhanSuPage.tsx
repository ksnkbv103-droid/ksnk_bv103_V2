"use client";

import React from "react";
import { Users } from "lucide-react";
import NhanSuTable from "../components/NhanSuTable";
import { KsnkPageHeader } from "@/components/shared/KsnkPageShell";
import { useModulePermission } from "@/hooks/useModulePermission";

const MODULE_KEY = "NHAN_SU";

export default function QuanLyNhanSuPage() {
  const { loading, allowed } = useModulePermission(MODULE_KEY);
  const canViewNhanSu = allowed.view;

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!canViewNhanSu) {
    return (
      <div className="rounded-[var(--radius-shell)] border border-slate-200 bg-white p-10 text-center text-sm font-medium text-slate-500">
        Bạn không có quyền truy cập module Nhân sự
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <KsnkPageHeader
        title={
          <span className="inline-flex items-center gap-2 text-[var(--primary)]">
            <Users size={22} aria-hidden /> Hồ sơ Nhân sự
          </span>
        }
        subtitle="Quản lý danh sách và phân bổ nhân lực toàn viện — liên kết khoa phòng cho giám sát và tài khoản đăng nhập."
      />

      <NhanSuTable
        permission={{
          import: allowed.import,
          create: allowed.create,
          edit: allowed.edit,
          delete: allowed.delete,
        }}
      />
    </div>
  );
}
