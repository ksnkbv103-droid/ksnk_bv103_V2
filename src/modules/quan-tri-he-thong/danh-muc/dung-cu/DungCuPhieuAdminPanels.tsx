"use client";

import React from "react";
import { CatalogDeNghiApproveQueue } from "./CatalogDeNghiApproveQueue";
import { SetReconcileApproveQueue } from "./SetReconcileApproveQueue";
import { SetReconcileHistoryList } from "./SetReconcileHistoryList";
import { useModulePermission } from "@/hooks/useModulePermission";

/** Hàng đợi duyệt + sổ rà soát hiện ngay tab Phiếu — chỉ ADMIN (chủ nhiệm khoa) thấy. */
export function DungCuPhieuAdminPanels() {
  const { loading, isAdmin } = useModulePermission("BO_DC");
  if (loading || !isAdmin) return null;
  return (
    <div className="space-y-4">
      <CatalogDeNghiApproveQueue />
      <SetReconcileApproveQueue />
      <SetReconcileHistoryList />
    </div>
  );
}
