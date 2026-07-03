"use client";

import { useMemo } from "react";
import { SIDEBAR_NAV_GROUPS } from "@/lib/nav/sidebar-nav-groups";
import { SIDEBAR_ADMIN_GROUPS } from "@/lib/nav/sidebar-admin-nav-groups";
import { canSeeNavGate } from "@/lib/nav/ksnk-nav-gates";
import type { RBACRoleRow } from "../rbac.types";
import { quanTriFormChrome as UI } from "@/modules/quan-tri-he-thong/lib/quan-tri-form-chrome";

type Props = {
  roles: RBACRoleRow[];
  matrix: Record<string, Set<string>>;
  permissions: { id: string; module_name: string; action: string }[];
  previewRoleId: string | null;
  onPreviewRoleChange: (roleId: string) => void;
};

/** Xem trước menu sidebar theo vai trò đang chọn (Wave 3). */
export default function RbacMenuPreviewPanel({
  roles,
  matrix,
  permissions,
  previewRoleId,
  onPreviewRoleChange,
}: Props) {
  const previewPerms = useMemo(() => {
    if (!previewRoleId) return new Set<string>();
    const ids = matrix[previewRoleId] || new Set<string>();
    const codes = new Set<string>();
    for (const p of permissions) {
      if (ids.has(p.id)) codes.add(`${p.module_name}::${p.action}`);
    }
    const role = roles.find((r) => r.id === previewRoleId);
    if (role && String(role.name).trim().toUpperCase() === "ADMIN") {
      for (const p of permissions) codes.add(`${p.module_name}::${p.action}`);
    }
    return codes;
  }, [previewRoleId, matrix, permissions, roles]);

  const canView = (moduleKey: string) =>
    previewPerms.has(`${moduleKey}::view`) || previewPerms.has(`${moduleKey}::VIEW`);

  const isAdminPreview =
    roles.find((r) => r.id === previewRoleId)?.name?.trim().toUpperCase() === "ADMIN";

  const visibleOps = SIDEBAR_NAV_GROUPS.flatMap((g) =>
    g.items.filter((item) => canSeeNavGate(isAdminPreview, canView, item.gate)).map((item) => item.name),
  );
  const visibleAdmin = SIDEBAR_ADMIN_GROUPS.flatMap((g) =>
    g.items.filter((item) => canSeeNavGate(isAdminPreview, canView, item.gate)).map((item) => item.name),
  );

  return (
    <div className={`${UI.sectionGap} rounded-[var(--radius-shell)] border border-slate-200 bg-slate-50/80 p-4`}>
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="rbac-preview-role" className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Xem trước menu
        </label>
        <select
          id="rbac-preview-role"
          value={previewRoleId ?? ""}
          onChange={(e) => onPreviewRoleChange(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
        >
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase text-slate-500">Vận hành</p>
          <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
            {visibleOps.length ? visibleOps.map((n) => <li key={n}>• {n}</li>) : <li className="text-slate-400">Không có mục</li>}
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase text-slate-500">Quản trị</p>
          <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
            {visibleAdmin.length ? visibleAdmin.map((n) => <li key={n}>• {n}</li>) : <li className="text-slate-400">Không có mục</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
