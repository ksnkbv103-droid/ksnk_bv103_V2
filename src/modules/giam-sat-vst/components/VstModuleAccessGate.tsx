"use client";

import React from "react";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";
import { useModulePermission } from "@/hooks/useModulePermission";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";

const MODULE_KEY = "GIAM_SAT_VST";

export function VstPermissionDeniedPanel({
  message = "Bạn không có quyền truy cập module Giám sát vệ sinh tay.",
}: {
  message?: string;
}) {
  return (
    <div className={`${C.panelInset} flex min-h-[240px] flex-col items-center justify-center p-8 text-center`}>
      <p className="text-sm font-semibold text-amber-900">Không có quyền truy cập</p>
      <p className="mt-2 max-w-md text-xs text-slate-600">{message}</p>
    </div>
  );
}

export function VstModuleAccessGate({
  children,
  requireCreate = false,
}: {
  children: React.ReactNode;
  requireCreate?: boolean;
}) {
  const { loading, allowed } = useModulePermission(MODULE_KEY);

  if (loading) return <SupervisionPageSkeleton />;

  if (!allowed.view) {
    return <VstPermissionDeniedPanel />;
  }

  if (requireCreate && !allowed.create && !allowed.edit) {
    return (
      <VstPermissionDeniedPanel message="Bạn không có quyền tạo hoặc sửa phiên giám sát vệ sinh tay. Liên hệ quản trị để được cấp quyền." />
    );
  }

  return <>{children}</>;
}
