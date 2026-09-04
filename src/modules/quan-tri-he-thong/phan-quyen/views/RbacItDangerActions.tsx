"use client";

import React, { useCallback, useState } from "react";
import { RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useModulePermission } from "@/hooks/useModulePermission";
import { bv103DesignTokens } from "@/lib/bv103-design-tokens";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import {
  resetKsnkRolePermissionPresets,
  syncPermissionRegistry,
} from "../actions/rbac.actions";

/** Registry sync / apply-preset — IT tab only (danger). */
export default function RbacItDangerActions() {
  const { isAdmin, loading: permLoading, allowed } = useModulePermission("PHAN_QUYEN");
  const canConfigureRbac = isAdmin || allowed.edit;
  const [isSyncing, setIsSyncing] = useState(false);
  const [isResettingPresets, setIsResettingPresets] = useState(false);

  const handleSync = useCallback(async () => {
    const ok = window.confirm(
      "Đồng bộ Registry quyền?\n\n" +
        "• Thêm/cập nhật danh sách module × hành động từ mã nguồn\n" +
        "• Gán đủ quyền cho Quản trị (ADMIN)\n" +
        "• KHÔNG ghi đè ô đã chỉnh trên Hội đồng / NV KSNK / Mạng lưới / Khách\n\n" +
        "Muốn đưa các vai trò về preset mặc định → dùng «Áp dụng preset vai trò».",
    );
    if (!ok) return;
    setIsSyncing(true);
    try {
      const res = await syncPermissionRegistry();
      if (res.success) {
        toast.success("Đã đồng bộ Registry (không ghi đè vai trò KSNK).");
      } else {
        toast.error("Lỗi đồng bộ Registry: " + (res.error || ""));
      }
    } catch {
      toast.error("Lỗi đồng bộ Registry.");
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const handleResetPresets = useCallback(async () => {
    const ok = window.confirm(
      "Áp dụng preset vai trò KSNK?\n\n" +
        "Sẽ GHI ĐÈ toàn bộ quyền của: Hội đồng, Nhân viên KSNK, Mạng lưới KSNK, Khách theo cấu hình mặc định.\n" +
        "Các chỉnh tay trên 4 vai trò này sẽ mất.\n\n" +
        "Quản trị (ADMIN) không bị ảnh hưởng.",
    );
    if (!ok) return;
    setIsResettingPresets(true);
    try {
      const res = await resetKsnkRolePermissionPresets();
      if (res.success) {
        toast.success("Đã áp dụng lại preset vai trò KSNK.");
      } else {
        toast.error("Lỗi áp dụng preset: " + (res.error || ""));
      }
    } catch {
      toast.error("Lỗi áp dụng preset vai trò.");
    } finally {
      setIsResettingPresets(false);
    }
  }, []);

  if (permLoading || !canConfigureRbac) return null;

  return (
    <div className={`${bv103LayoutChrome.noticeAmber} mb-4 space-y-2`} role="note">
      <p className="text-xs font-semibold text-amber-950">RBAC — thao tác nguy hiểm (IT)</p>
      <p className="text-[11px] text-amber-900">
        Đồng bộ Registry thêm/cập nhật quyền từ mã nguồn (không ghi đè vai trò KSNK). Áp dụng
        preset ghi đè Hội đồng / NV / Mạng lưới / Khách.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleSync()}
          disabled={isSyncing || isResettingPresets}
          className={bv103DesignTokens.btnSecondary}
          title="Thêm quyền mới từ mã nguồn; không ghi đè vai trò KSNK"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Đang đồng bộ…" : "Đồng bộ Registry"}
        </button>
        <button
          type="button"
          onClick={() => void handleResetPresets()}
          disabled={isSyncing || isResettingPresets}
          className={bv103DesignTokens.btnSecondary}
          title="Ghi đè quyền Hội đồng / NV / Mạng lưới / Khách về preset mặc định"
        >
          <RotateCcw className={`h-3.5 w-3.5 ${isResettingPresets ? "animate-spin" : ""}`} />
          {isResettingPresets ? "Đang áp dụng…" : "Áp dụng preset vai trò"}
        </button>
      </div>
    </div>
  );
}
