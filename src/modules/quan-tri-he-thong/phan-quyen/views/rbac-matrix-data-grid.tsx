"use client";

import React, { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import RBACPermissionCell from "../components/RBACPermissionCell";
import { getModuleDisplayName, MODULE_GROUPS, MODULE_TO_GROUP } from "@/lib/permission-registry";
import { bv103DesignTokens } from "@/lib/bv103-design-tokens";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import {
  RBAC_MATRIX_ROLE_HEADER_LABEL,
  type RBACPermissionRow,
  type RBACRoleRow,
} from "../rbac.types";

export type RbacMatrixActionCol = {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;
  full: string;
  order: number;
};

type Props = {
  roles: RBACRoleRow[];
  moduleNames: string[];
  actions: RbacMatrixActionCol[];
  permissions: RBACPermissionRow[];
  matrix: Record<string, Set<string>>;
  onTogglePermission: (roleId: string, permId: string) => void;
  /** Bật/tắt toàn bộ ô của một hành động (xem/sửa/…) cho mọi module, theo một vai trò. */
  onBulkSetActionForRole: (roleId: string, actionKey: string, enable: boolean) => void;
  onBulkSetAllForRole: (roleId: string, enable: boolean) => void;
};

export function RBACMatrixDataGrid({
  roles,
  moduleNames,
  actions,
  permissions,
  matrix,
  onTogglePermission,
  onBulkSetActionForRole,
  onBulkSetAllForRole,
}: Props) {
  const permLookup = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of permissions) {
      m.set(`${p.module_name}::${p.action}`, p.id);
    }
    return m;
  }, [permissions]);

  // Phân nhóm module
  const groupedModules = moduleNames.reduce((acc, mod) => {
    const groupKey = MODULE_TO_GROUP[mod] || "SYSTEM";
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(mod);
    return acc;
  }, {} as Record<string, string[]>);

  const groupKeys = Object.keys(MODULE_GROUPS) as (keyof typeof MODULE_GROUPS)[];

  return (
    <div className="overflow-hidden border border-slate-200 rounded-2xl bg-white shadow-sm">
      <div className="custom-scrollbar max-h-[min(calc(100dvh-13rem),720px)] overflow-auto overscroll-contain">
        <table className="w-full min-w-[720px] border-collapse">
          <thead className="sticky top-0 z-30 bg-slate-50 shadow-[0_1px_0_rgb(226_232_240)]">
            <tr className="border-b border-slate-200">
              <th className="p-4 text-left min-w-[240px] sticky left-0 bg-slate-50 z-40 border-r border-slate-200">
                <span className={bv103DesignTokens.tableHeader}>Cấu trúc Module</span>
              </th>
              {roles.map((role: RBACRoleRow) => {
                const key = String(role.name ?? "").trim().toUpperCase();
                const headerLabel = RBAC_MATRIX_ROLE_HEADER_LABEL[key] ?? role.name;
                return (
                <th key={role.id} className="p-3 text-center min-w-[200px] border-r border-slate-200 last:border-r-0 align-top">
                  <p className="text-[11px] font-semibold uppercase tracking-wider leading-snug text-slate-700">{headerLabel}</p>
                  <p className={`mt-0.5 ${bv103DesignTokens.metaMono}`}>{role.name}</p>
                  <div className="mt-2 flex justify-center gap-2.5">
                    {actions.map((a) => (
                      <span key={a.key} className="text-[11px] font-medium text-slate-400" title={a.full}>
                        {a.label}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 space-y-1.5">
                    <div className="flex flex-wrap justify-center gap-1">
                      {actions.map((a) => (
                        <button
                          key={`on-${a.key}`}
                          type="button"
                          title={`Bật hết quyền “${a.full}” trên mọi module cho ${role.name}`}
                          onClick={() => onBulkSetActionForRole(role.id, a.key, true)}
                          className="min-w-[1.75rem] rounded border border-emerald-200 bg-emerald-50/80 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                        >
                          +{a.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        title={`Bật tất cả quyền trên mọi module cho ${role.name}`}
                        onClick={() => onBulkSetAllForRole(role.id, true)}
                        className="rounded border border-[var(--primary)]/40 bg-[var(--primary)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--primary)] hover:bg-[var(--primary)]/20"
                      >
                        Tất cả
                      </button>
                    </div>
                    <div className="flex flex-wrap justify-center gap-1 border-t border-slate-100 pt-1.5">
                      {actions.map((a) => (
                        <button
                          key={`off-${a.key}`}
                          type="button"
                          title={`Tắt hết quyền “${a.full}” trên mọi module cho ${role.name}`}
                          onClick={() => onBulkSetActionForRole(role.id, a.key, false)}
                          className="min-w-[1.75rem] rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-500 hover:bg-slate-100"
                        >
                          −{a.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        title={`Tắt toàn bộ quyền của ${role.name}`}
                        onClick={() => onBulkSetAllForRole(role.id, false)}
                        className="rounded border border-red-100 bg-red-50/80 px-2 py-0.5 text-[11px] font-semibold text-red-700 hover:bg-red-100"
                      >
                        Xóa hết
                      </button>
                    </div>
                  </div>
                </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {groupKeys.map((groupKey) => {
              const groupModules = groupedModules[groupKey] || [];
              if (groupModules.length === 0) return null;

              return (
                <React.Fragment key={groupKey}>
                  {/* Tiêu đề Nhóm */}
                  <tr className="bg-slate-50/50">
                    <td 
                      colSpan={roles.length + 1} 
                      className="px-6 py-2 sticky left-0 z-20 border-r border-slate-100 bg-slate-50/50"
                    >
                      <span className={`${bv103LayoutChrome.labelBlockAccent} opacity-80`}>
                        {MODULE_GROUPS[groupKey]}
                      </span>
                    </td>
                  </tr>

                  {/* Modules trong nhóm */}
                  {groupModules.sort().map((moduleName) => (
                    <tr key={moduleName} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 sticky left-0 bg-white z-10 border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold leading-tight text-slate-700">
                            {getModuleDisplayName(moduleName)}
                          </span>
                          <span className={`mt-0.5 ${bv103DesignTokens.metaMono} uppercase opacity-70`}>
                            {moduleName}
                          </span>
                        </div>
                      </td>
                      {roles.map((role: RBACRoleRow) => (
                        <td
                          key={role.id}
                          className="px-4 py-4 border-r border-slate-100 last:border-r-0 text-center"
                        >
                          <RBACPermissionCell
                            actions={actions}
                            permLookup={permLookup}
                            moduleName={moduleName}
                            roleName={role.name}
                            rolePerms={matrix[role.id]}
                            onToggle={(permId) => onTogglePermission(role.id, permId)}
                            moduleLabel={getModuleDisplayName(moduleName)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

