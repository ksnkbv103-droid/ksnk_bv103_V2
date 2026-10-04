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

/** Thao tác nguy hiểm phân quyền — tab quản trị. */
export default function RbacItDangerActions() {
  const { isAdmin, loading: permLoading } = useModulePermission("PHAN_QUYEN");
  const canConfigureRbac = isAdmin;
  const [isSyncing, setIsSyncing] = useState(false);
  const [isResettingPresets, setIsResettingPresets] = useState(false);

  const handleSync = useCallback(async () => {
    const ok = window.confirm(
      "Cập nhật danh sách quyền theo phiên bản phần mềm?\n\n" +
        "• Thêm/cập nhật danh sách module × hành động từ mã nguồn\n" +
        "• Gán đủ quyền cho Quản trị hệ thống\n" +
        "• Không ghi đè ô đã chỉnh trên Hội đồng / NV KSNK / Mạng lưới / Khách\n\n" +
        "Muốn đưa các vai trò về quyền mặc định → dùng «Đặt lại quyền mặc định».",
    );
    if (!ok) return;
    setIsSyncing(true);
    try {
      const res = await syncPermissionRegistry();
      if (res.success) {
        toast.success("Đã cập nhật danh sách quyền (không ghi đè vai trò KSNK).");
      } else {
        toast.error("Lỗi cập nhật danh sách quyền: " + (res.error || ""));
      }
    } catch {
      toast.error("Lỗi cập nhật danh sách quyền.");
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const handleResetPresets = useCallback(async () => {
    const ok = window.confirm(
      "Đặt lại quyền mặc định cho vai trò KSNK?\n\n" +
        "Sẽ ghi đè toàn bộ quyền của: Hội đồng, Nhân viên KSNK, Mạng lưới KSNK, Khách theo cấu hình mặc định.\n" +
        "Các chỉnh tay trên 4 vai trò này sẽ mất.\n\n" +
        "Quản trị hệ thống không bị ảnh hưởng.",
    );
    if (!ok) return;
    setIsResettingPresets(true);
    try {
      const res = await resetKsnkRolePermissionPresets();
      if (res.success) {
        toast.success("Đã đặt lại quyền mặc định cho vai trò KSNK.");
      } else {
        toast.error("Lỗi đặt lại quyền mặc định: " + (res.error || ""));
      }
    } catch {
      toast.error("Lỗi đặt lại quyền mặc định.");
    } finally {
      setIsResettingPresets(false);
    }
  }, []);

  if (permLoading || !canConfigureRbac) return null;

  return (
    <div className={`${bv103LayoutChrome.noticeAmber} mb-4 space-y-2`} role="note">
      <p className="text-xs font-semibold text-amber-950">
        Phân quyền — thao tác dành cho quản trị hệ thống
      </p>
      <p className="text-[11px] text-amber-900">
        Cập nhật danh sách quyền theo phiên bản phần mềm (không ghi đè vai trò KSNK). Đặt lại quyền
        mặc định ghi đè Hội đồng / NV / Mạng lưới / Khách.
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
          {isSyncing ? "Đang cập nhật…" : "Cập nhật danh sách quyền"}
        </button>
        <button
          type="button"
          onClick={() => void handleResetPresets()}
          disabled={isSyncing || isResettingPresets}
          className={bv103DesignTokens.btnSecondary}
          title="Ghi đè quyền Hội đồng / NV / Mạng lưới / Khách về mặc định"
        >
          <RotateCcw className={`h-3.5 w-3.5 ${isResettingPresets ? "animate-spin" : ""}`} />
          {isResettingPresets ? "Đang đặt lại…" : "Đặt lại quyền mặc định"}
        </button>
      </div>
    </div>
  );
}
