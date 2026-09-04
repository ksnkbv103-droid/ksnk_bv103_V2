// src/app/quan-tri-he-thong/page.tsx
"use client";

import React, { Suspense } from "react";
import QuanTriDanhMucPage from "@/modules/quan-tri-he-thong/danh-muc/views/QuanTriDanhMucPage";
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
      <div className="mx-auto mt-8 max-w-lg space-y-[var(--bv103-space-3)] rounded-[var(--radius-shell)] border border-slate-200 bg-white px-5 py-6 text-center shadow-sm">
        <h2 className={`${T.pageTitle} text-slate-800`}>Truy cập bị từ chối</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          Cần quyền xem ít nhất một trong: <strong className="font-semibold text-slate-700">Danh mục gốc</strong>,{" "}
          <strong className="font-semibold text-slate-700">Phân quyền</strong>,{" "}
          <strong className="font-semibold text-slate-700">Nhân sự</strong>, hoặc vai trò quản trị.
        </p>
        <div className="rounded-[var(--radius-shell)] border border-slate-100 bg-slate-50 px-3 py-2.5 text-left">
          <p className={T.labelBlock}>Tài khoản hiện tại</p>
          <p className="text-sm font-medium text-slate-800">{userEmail || "Chưa đăng nhập"}</p>
        </div>
        <p className="bv103-type-note">Menu Quản trị ẩn khi chưa đủ quyền xem các module trên.</p>
      </div>
    );
  }

  return (
    <div className="bv103-stack-page pb-12 animate-in fade-in duration-500">
      <Suspense
        fallback={
          <div className="flex min-h-[160px] items-center justify-center" aria-busy="true">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--primary)]" />
          </div>
        }
      >
        <QuanTriDanhMucPage />
      </Suspense>
    </div>
  );
}
