// src/app/quan-tri-he-thong/page.tsx
"use client";

import React, { Suspense } from "react";
import { Settings } from "lucide-react";
import QuanTriDanhMucPage from "@/modules/quan-tri-he-thong/danh-muc/views/QuanTriDanhMucPage";
import { KsnkPageHeader } from "@/components/shared/KsnkPageShell";
import { usePermission } from "@/hooks/usePermission";
import { canSeeQuanTriSection } from "@/lib/nav/ksnk-nav-gates";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";

export default function QuanTriHeThongPage() {
  const { loading, userEmail, isAdmin, canView } = usePermission(undefined, "view");
  const mayEnterHub = canSeeQuanTriSection(isAdmin, canView);

  if (loading) return (
    <div className="p-20 text-center flex flex-col items-center gap-4">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
      <p className={T.pageEyebrow}>Đang xác thực quyền khu Quản trị…</p>
    </div>
  );
  
  if (!mayEnterHub) {
    return (
      <div className="p-20 text-center premium-card glass-panel max-w-2xl mx-auto mt-20 space-y-4">
        <div className="text-5xl">🔒</div>
        <h2 className={`${T.pageTitle} text-red-700`}>Truy cập bị từ chối</h2>
        <p className="text-sm font-normal leading-relaxed text-slate-600">
          Cần quyền xem ít nhất một trong: Danh mục (<strong className="font-semibold text-slate-700">DANH_MUC</strong>), Phân quyền (
          <strong className="font-semibold text-slate-700">PHAN_QUYEN</strong>
          ), Nhân sự (<strong className="font-semibold text-slate-700">NHAN_SU</strong>), hoặc vai trò quản trị.
        </p>
        <div className="rounded-[var(--radius-shell)] border border-slate-100 bg-slate-50 p-4">
          <p className={T.labelBlock}>Tài khoản hiện tại</p>
          <p className="text-sm font-medium text-slate-800">{userEmail || "Chưa đăng nhập"}</p>
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
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
            </div>
          }
        >
          <QuanTriDanhMucPage />
        </Suspense>
      </div>
    </div>
  );
}
