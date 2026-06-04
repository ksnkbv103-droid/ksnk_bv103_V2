"use client";

import React, { useCallback, useEffect, useState } from "react";
import { getRBACData, saveFullRBACMatrix, syncPermissionRegistry } from "../actions/rbac.actions";
import { toast } from "sonner";
import { useModulePermission } from "@/hooks/useModulePermission";
import { Shield, Lock, RefreshCw } from "lucide-react";
import { KsnkPageHeader } from "@/components/shared/KsnkPageShell";
import { bv103DesignTokens } from "@/lib/bv103-design-tokens";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import type { RBACDataSuccess, RBACPermissionRow, RBACRoleRow } from "../rbac.types";
import { selectRolesForRbacMatrixColumns } from "../rbac.types";
import { RBAC_ACTION_FALLBACK_META, RBAC_ACTION_META } from "./rbac-matrix-action-meta";
import { RBACMatrixDataGrid } from "./rbac-matrix-data-grid";

export default function RBACMatrixView() {
  const { isAdmin, loading: permLoading, allowed } = useModulePermission("PHAN_QUYEN");
  const canConfigureRbac = isAdmin || allowed.edit;
  const [data, setData] = useState<RBACDataSuccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [matrix, setMatrix] = useState<Record<string, Set<string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getRBACData();
      if (res.success) {
        setData(res);
        const newMatrix: Record<string, Set<string>> = {};
        res.roles?.forEach((r: RBACRoleRow) => {
          const pIds = (res.mappings || [])
            .filter((m) => m.role_id === r.id)
            .map((m) => m.permission_id);
          newMatrix[r.id] = new Set(pIds);
        });
        const allPermIds = (res.permissions || []).map((p: RBACPermissionRow) => p.id);
        res.roles?.forEach((r: RBACRoleRow) => {
          if (String(r.name || "").trim().toUpperCase() === "ADMIN") {
            newMatrix[r.id] = new Set(allPermIds);
          }
        });
        setMatrix(newMatrix);
      } else {
        toast.error("Lỗi tải dữ liệu: " + res.error);
      }
    } catch (e) {
      console.error("RBAC Load Error:", e);
      toast.error("Không thể kết nối tới máy chủ bảo mật.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await syncPermissionRegistry();
      toast.success("Đã đồng bộ Registry quyền thành công!");
      await loadData();
    } catch {
      toast.error("Lỗi đồng bộ Registry.");
    } finally {
      setIsSyncing(false);
    }
  }, [loadData]);

  useEffect(() => {
    if (permLoading || !canConfigureRbac) return;
    void Promise.resolve().then(() => {
      void loadData();
    });
  }, [canConfigureRbac, permLoading, loadData]);

  const togglePermission = (roleId: string, permId: string) => {
    setMatrix((prev) => {
      const next = { ...prev };
      const rolePerms = new Set(next[roleId] || []);
      if (rolePerms.has(permId)) rolePerms.delete(permId);
      else rolePerms.add(permId);
      next[roleId] = rolePerms;
      return next;
    });
  };

  const bulkSetActionForRole = useCallback(
    (roleId: string, actionKey: string, enable: boolean) => {
      const perms = data?.permissions || [];
      const ids = perms.filter((p) => p.action === actionKey).map((p) => p.id);
      setMatrix((prev) => {
        const next = { ...prev };
        const s = new Set(next[roleId] || []);
        ids.forEach((id) => {
          if (enable) s.add(id);
          else s.delete(id);
        });
        next[roleId] = s;
        return next;
      });
    },
    [data?.permissions],
  );

  const bulkSetAllForRole = useCallback(
    (roleId: string, enable: boolean) => {
      const ids = (data?.permissions || []).map((p) => p.id);
      setMatrix((prev) => {
        const next = { ...prev };
        const s = new Set(next[roleId] || []);
        ids.forEach((id) => {
          if (enable) s.add(id);
          else s.delete(id);
        });
        next[roleId] = s;
        return next;
      });
    },
    [data?.permissions],
  );

  const handleSaveAll = async () => {
    setIsSaving(true);
    const matrixToSave: Record<string, string[]> = {};
    Object.keys(matrix).forEach((roleId) => {
      matrixToSave[roleId] = Array.from(matrix[roleId]);
    });
    const res = await saveFullRBACMatrix(matrixToSave);
    if (res.success) toast.success("Đã cập nhật ma trận phân quyền hệ thống!");
    else toast.error("Lỗi: " + res.error);
    setIsSaving(false);
  };

  if (permLoading || loading)
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
        <p className={bv103DesignTokens.labelBlockMuted}>Đang tải ma trận bảo mật…</p>
      </div>
    );

  if (!canConfigureRbac)
    return (
      <div className={`mx-auto mt-16 max-w-xl p-10 text-center ${bv103LayoutChrome.panelShellPadded}`}>
        <Lock className="mx-auto mb-4 h-14 w-14 text-red-500 opacity-50" />
        <h2 className={bv103DesignTokens.pageTitle}>Truy cập bị hạn chế</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Ma trận phân quyền chỉ dành cho quản trị hoặc người có quyền <strong>PHAN_QUYEN — Sửa</strong>.
        </p>
      </div>
    );

  const moduleNames = Array.from(
    new Set((data?.permissions || []).map((p: RBACPermissionRow) => p.module_name)),
  ) as string[];
  const roles = selectRolesForRbacMatrixColumns(data?.roles || []);
  const actionKeys = (
    Array.from(new Set((data?.permissions || []).map((p: RBACPermissionRow) => p.action))) as string[]
  ).sort((a, b) => (RBAC_ACTION_META[a]?.order ?? 99) - (RBAC_ACTION_META[b]?.order ?? 99));
  const actions = actionKeys.map((key: string) => ({
    key,
    ...(RBAC_ACTION_META[key] ?? {
      label: key.slice(0, 1).toUpperCase(),
      icon: RBAC_ACTION_FALLBACK_META.icon,
      color: RBAC_ACTION_FALLBACK_META.color,
      full: key.toUpperCase(),
      order: RBAC_ACTION_FALLBACK_META.order,
    }),
  }));

  if (roles.length === 0 || moduleNames.length === 0)
    return (
      <div className={`mx-auto mt-16 max-w-xl p-10 text-center ${bv103LayoutChrome.panelShellPadded}`}>
        <Shield className="mx-auto mb-4 h-14 w-14 text-[var(--primary)] opacity-30" />
        <h2 className={bv103DesignTokens.pageTitle}>Dữ liệu trống</h2>
        <p className="mt-3 text-sm text-slate-600">Không tìm thấy vai trò hoặc quyền. Kiểm tra seed RBAC.</p>
        <button type="button" onClick={() => void loadData()} className={`mt-6 ${bv103DesignTokens.btnPrimary}`}>
          Thử tải lại
        </button>
      </div>
    );

  return (
    <div className={`${bv103DesignTokens.pageOuter} pb-24`}>
      <KsnkPageHeader
        title="Ma trận phân quyền"
        subtitle="Cấu hình quyền theo module × hành động — đồng bộ Registry trước khi chỉnh."
        actions={
          <>
            <button
              type="button"
              onClick={() => void handleSync()}
              disabled={isSyncing}
              className={bv103DesignTokens.btnSecondary}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Đang đồng bộ…" : "Đồng bộ Registry"}
            </button>
            <button type="button" onClick={() => void handleSaveAll()} disabled={isSaving} className={bv103DesignTokens.btnPrimary}>
              <Shield className="h-3.5 w-3.5" />
              {isSaving ? "Đang lưu…" : "Lưu ma trận"}
            </button>
          </>
        }
      />

      <RBACMatrixDataGrid
        roles={roles}
        moduleNames={moduleNames}
        actions={actions}
        permissions={data!.permissions}
        matrix={matrix}
        onTogglePermission={togglePermission}
        onBulkSetActionForRole={bulkSetActionForRole}
        onBulkSetAllForRole={bulkSetAllForRole}
      />
    </div>
  );
}
