"use client";

import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import RBACPermissionCell from "../components/RBACPermissionCell";
import { getModuleDisplayName, MODULE_GROUPS, MODULE_TO_GROUP } from "@/lib/permission-registry";
import { getPermissionModuleBusinessDescription } from "@/lib/permission-module-business-descriptions";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import type { RBACPermissionRow, RBACRoleRow } from "../rbac.types";
import type { RbacMatrixActionCol } from "./rbac-matrix-data-grid";

type Props = {
  roles: RBACRoleRow[];
  moduleNames: string[];
  actions: RbacMatrixActionCol[];
  permissions: RBACPermissionRow[];
  matrix: Record<string, Set<string>>;
  onTogglePermission: (roleId: string, permId: string) => void;
  onBulkSetActionForRole: (roleId: string, actionKey: string, enable: boolean) => void;
  onBulkSetAllForRole: (roleId: string, enable: boolean) => void;
};

export function RBACMatrixMobileView({
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

  const groupedModules = moduleNames.reduce(
    (acc, mod) => {
      const groupKey = MODULE_TO_GROUP[mod] || "SYSTEM";
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(mod);
      return acc;
    },
    {} as Record<string, string[]>,
  );

  const groupKeys = Object.keys(MODULE_GROUPS) as (keyof typeof MODULE_GROUPS)[];
  const [openModule, setOpenModule] = useState<string | null>(null);

  return (
    <ul className="divide-y divide-slate-100">
      {groupKeys.map((groupKey) => {
        const groupModules = groupedModules[groupKey] || [];
        if (groupModules.length === 0) return null;

        return (
          <li key={groupKey}>
            <p className={`${bv103LayoutChrome.labelBlockAccent} bg-slate-50/80 px-4 py-2.5`}>
              {MODULE_GROUPS[groupKey]}
            </p>
            <ul className="divide-y divide-slate-100">
              {groupModules.sort().map((moduleName) => {
                const expanded = openModule === moduleName;
                return (
                  <li key={moduleName}>
                    <button
                      type="button"
                      onClick={() => setOpenModule(expanded ? null : moduleName)}
                      className="flex w-full items-start gap-2 px-4 py-3 text-left touch-manipulation active:bg-slate-50"
                    >
                      {expanded ? (
                        <ChevronDown size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden />
                      ) : (
                        <ChevronRight size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-800">
                          {getModuleDisplayName(moduleName)}
                        </span>
                        {getPermissionModuleBusinessDescription(moduleName) ? (
                          <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                            {getPermissionModuleBusinessDescription(moduleName)}
                          </span>
                        ) : null}
                      </span>
                    </button>
                    {expanded ? (
                      <div className="space-y-3 border-t border-slate-100 bg-slate-50/40 px-4 pb-4 pt-3">
                        {roles.map((role) => (
                          <div
                            key={role.id}
                            className="rounded-[var(--radius-shell)] border border-slate-200/90 bg-white p-3 shadow-sm"
                          >
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-slate-800">{role.name}</p>
                              <div className="flex flex-wrap gap-1">
                                <button
                                  type="button"
                                  onClick={() => onBulkSetAllForRole(role.id, true)}
                                  className="rounded border border-[var(--primary)]/40 bg-[var(--primary)]/10 px-2 py-1 text-[11px] font-semibold text-[var(--primary)]"
                                >
                                  Bật hết
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onBulkSetAllForRole(role.id, false)}
                                  className="rounded border border-red-100 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700"
                                >
                                  Tắt hết
                                </button>
                              </div>
                            </div>
                            <div className="mb-2 flex flex-wrap gap-1">
                              {actions.map((a) => (
                                <span key={a.key} className="inline-flex gap-1">
                                  <button
                                    type="button"
                                    title={`Bật ${a.full}`}
                                    onClick={() => onBulkSetActionForRole(role.id, a.key, true)}
                                    className="min-h-9 rounded border border-emerald-200 bg-emerald-50 px-2 text-[11px] font-semibold text-emerald-800"
                                  >
                                    +{a.label}
                                  </button>
                                  <button
                                    type="button"
                                    title={`Tắt ${a.full}`}
                                    onClick={() => onBulkSetActionForRole(role.id, a.key, false)}
                                    className="min-h-9 rounded border border-slate-200 bg-white px-2 text-[11px] text-slate-500"
                                  >
                                    −{a.label}
                                  </button>
                                </span>
                              ))}
                            </div>
                            <RBACPermissionCell
                              actions={actions}
                              permLookup={permLookup}
                              moduleName={moduleName}
                              roleName={role.name}
                              rolePerms={matrix[role.id]}
                              onToggle={(permId) => onTogglePermission(role.id, permId)}
                              moduleLabel={getModuleDisplayName(moduleName)}
                            />
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
