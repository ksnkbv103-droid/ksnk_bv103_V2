// src/app/quan-tri-he-thong/page.tsx
"use client";

import React, { Suspense } from "react";
import { Settings } from "lucide-react";
import QuanTriDanhMucPage from "@/modules/quan-tri-he-thong/danh-muc/views/QuanTriDanhMucPage";
import { KsnkPageHeader } from "@/components/shared/KsnkPageShell";
import { usePermission } from "@/hooks/usePermission";
import { canSeeQuanTriSection } from "@/lib/nav/ksnk-nav-gates";

export default function QuanTriHeThongPage() {
  const { loading, userEmail, isAdmin, canView } = usePermission(undefined, "view");
  const mayEnterHub = canSeeQuanTriSection(isAdmin, canView);

  if (loading) return (
    <div className="p-20 text-center flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-[#026f17] border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Đang xác thực quyền khu Quản trị...</p>
    </div>
  );
  
  if (!mayEnterHub) {
    return (
      <div className="p-20 text-center premium-card glass-panel max-w-2xl mx-auto mt-20 space-y-4">
        <div className="text-5xl">🔒</div>
        <h2 className="text-2xl font-black text-red-600 uppercase tracking-tighter">Truy cập bị từ chối</h2>
        <p className="text-slate-500 font-bold text-sm leading-relaxed">
          Cần quyền xem ít nhất một trong: Danh mục (<strong className="font-semibold text-slate-700">DANH_MUC</strong>), Phân quyền (
          <strong className="font-semibold text-slate-700">PHAN_QUYEN</strong>
          ), Nhân sự (<strong className="font-semibold text-slate-700">NHAN_SU</strong>), hoặc vai trò quản trị.
        </p>
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tài khoản hiện tại:</p>
          <p className="text-sm font-bold text-slate-800">{userEmail || "Chưa đăng nhập"}</p>
        </div>
        <p className="text-[11px] text-slate-400 italic">Đồng bộ với menu cạnh: khoá điều hướng Quản trị khi không đủ quyền Xem các module trên.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <KsnkPageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Settings className="h-6 w-6 text-[var(--primary)]" aria-hidden />
            Hệ thống
          </span>
        }
        subtitle="Trung tâm danh mục, phân quyền và giám trị dữ liệu master (MDM)."
      />

      <div className="animate-in slide-in-from-bottom-4 duration-500">
        <Suspense
          fallback={
            <div className="flex min-h-[200px] items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#026f17] border-t-transparent" />
            </div>
          }
        >
          <QuanTriDanhMucPage />
        </Suspense>
      </div>
    </div>
  );
}
