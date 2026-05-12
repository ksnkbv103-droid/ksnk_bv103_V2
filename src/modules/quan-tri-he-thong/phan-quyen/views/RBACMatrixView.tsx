// src/modules/quan-tri-he-thong/phan-quyen/views/RBACMatrixView.tsx
"use client";

import React, { useCallback, useEffect, useState } from "react";
import { getRBACData, saveFullRBACMatrix, syncPermissionRegistry } from "../actions/rbac.actions";
import { toast } from "sonner";
import { useModulePermission } from "@/hooks/useModulePermission";
import { Shield, Lock, RefreshCw } from "lucide-react";
import type { RBACDataSuccess, RBACPermissionRow, RBACRoleRow } from "../rbac.types";
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
      // Chỉ đọc dữ liệu — KHÔNG sync registry tự động
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
        /** ADMIN bypass RBAC ở runtime (usePermission) nhưng DB có thể chưa có mapping → ma trận trông trống. Luôn hiển thị full để đồng bộ khi Lưu. */
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

  /** Đồng bộ Registry thủ công — chỉ Admin bấm nút mới chạy. */
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

  const bulkSetActionForRole = useCallback((roleId: string, actionKey: string, enable: boolean) => {
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
  }, [data?.permissions]);

  const bulkSetAllForRole = useCallback((roleId: string, enable: boolean) => {
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
  }, [data?.permissions]);

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
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <div className="w-12 h-12 border-4 border-[#026f17] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Đang tải ma trận bảo mật...</p>
      </div>
    );

  if (!canConfigureRbac)
    return (
      <div className="max-w-xl mx-auto mt-20 premium-card glass-panel p-12 text-center space-y-6">
        <Lock className="w-16 h-16 text-red-500 mx-auto opacity-50" />
        <h2 className="text-2xl font-black text-slate-800 uppercase">Truy cập bị hạn chế</h2>
        <p className="text-slate-500 font-medium">
          Ma trận phân quyền chỉ dành cho vai trò quản trị (ADMIN / email tin cậy) hoặc người được gán quyền <strong className="font-semibold text-slate-700">PHAN_QUYEN — Sửa</strong> trong RBAC.
        </p>
      </div>
    );

  const moduleNames = Array.from(
    new Set((data?.permissions || []).map((p: RBACPermissionRow) => p.module_name)),
  ) as string[];
  const roles = data?.roles || [];
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
      <div className="max-w-xl mx-auto mt-20 premium-card glass-panel p-12 text-center space-y-6">
        <Shield className="w-16 h-16 text-[#026f17] mx-auto opacity-20" />
        <h2 className="text-2xl font-black text-slate-800 uppercase">Dữ liệu trống</h2>
        <p className="text-slate-500 font-medium leading-relaxed">
          Không tìm thấy danh sách Vai trò hoặc Quyền trong hệ thống. Vui lòng kiểm tra lại Database hoặc khởi tạo dữ liệu mẫu.
        </p>
        <button
          type="button"
          onClick={() => void loadData()}
          className="px-8 py-3 bg-[#026f17] text-white rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 transition-all"
        >
          Thử tải lại dữ liệu
        </button>
      </div>
    );

  return (

    <div className="space-y-8 pb-32 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-[#026f17]" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cấu hình Hệ thống</span>
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">
            Ma trận <span className="text-[#026f17]">Phân quyền</span>
          </h1>
          <p className="text-slate-500 text-sm max-w-xl">
            Quản lý quyền hạn truy cập các module nghiệp vụ cho từng nhóm vai trò trong bệnh viện.
          </p>
          <p className="text-[11px] text-slate-600 max-w-2xl leading-relaxed border-l-2 border-amber-400/80 pl-3 mt-2">
            <strong className="text-slate-800">ADMIN:</strong> Khi đăng nhập, tài khoản có vai trò ADMIN (hoặc email tin cậy){" "}
            <strong>luôn được full quyền</strong> dù DB chưa ghi từng dòng — ma trận vẫn hiển thị đủ ô để bạn{" "}
            <strong>Lưu</strong> và đồng bộ xuống database. Dùng hàng <strong>Bật nhanh / Tắt nhanh</strong> trên mỗi cột vai trò để gán
            cả cột Xem, Sửa, Xóa… một lượt.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => void handleSync()}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-600 uppercase tracking-wider transition-all hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Đang đồng bộ..." : "Đồng bộ Registry"}
          </button>
          <button
            type="button"
            onClick={() => void handleSaveAll()}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#026f17] text-white text-[10px] font-bold uppercase tracking-wider transition-all hover:bg-[#015a12] shadow-sm disabled:opacity-50"
          >
            <Shield className="w-3 h-3" />
            {isSaving ? "Đang lưu..." : "Lưu ma trận"}
          </button>
        </div>
      </header>



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


      <div className="text-center mt-10">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">End of Security Configuration Page</p>
      </div>
    </div>
  );
}
