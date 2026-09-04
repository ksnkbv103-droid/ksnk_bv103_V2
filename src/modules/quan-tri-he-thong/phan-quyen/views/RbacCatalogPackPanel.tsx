"use client";

import { Layers } from "lucide-react";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import {
  ALL_CATALOG_MODULES,
  applyCatalogPackToSet,
  CATALOG_PERMISSION_PACKS,
  type CatalogPackId,
} from "../lib/catalog-permission-packs";
import type { RBACPermissionRow, RBACRoleRow } from "../rbac.types";
import { RBAC_MATRIX_ROLE_HEADER_LABEL } from "../rbac.types";

type Props = {
  roles: RBACRoleRow[];
  permissions: RBACPermissionRow[];
  matrix: Record<string, Set<string>>;
  previewRoleId: string | null;
  onPreviewRoleChange: (roleId: string) => void;
  onApplyPack: (roleId: string, next: Set<string>) => void;
};

export default function RbacCatalogPackPanel({
  roles,
  permissions,
  matrix,
  previewRoleId,
  onPreviewRoleChange,
  onApplyPack,
}: Props) {
  const role = roles.find((r) => r.id === previewRoleId);
  const isAdmin = String(role?.name ?? "").trim().toUpperCase() === "ADMIN";
  const roleLabel = role
    ? RBAC_MATRIX_ROLE_HEADER_LABEL[String(role.name).trim().toUpperCase()] ?? role.name
    : "—";

  const apply = (modules: readonly string[], mode: "full" | "view" | "off") => {
    if (!previewRoleId || isAdmin) return;
    const current = matrix[previewRoleId] || new Set<string>();
    onApplyPack(previewRoleId, applyCatalogPackToSet(current, permissions, modules, mode));
  };

  return (
    <div className="rounded-[var(--radius-shell)] border border-slate-200 bg-white p-4 shadow-sm">
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Layers className="h-4 w-4 text-slate-400" aria-hidden />
        Gói quyền danh mục
      </p>
      <p className="mt-1 text-[11px] text-slate-500">
        Gom ~13 ô sửa danh mục thành vài gói. Không đổi cửa RLS. Còn chỉnh từng ô bên dưới nếu cần. Quản trị (ADMIN) giữ đủ quyền — không áp gói.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className={T.labelBlock} htmlFor="rbac-pack-role">
          Áp cho vai trò
        </label>
        <select
          id="rbac-pack-role"
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
          value={previewRoleId ?? ""}
          onChange={(e) => onPreviewRoleChange(e.target.value)}
        >
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {RBAC_MATRIX_ROLE_HEADER_LABEL[String(r.name).trim().toUpperCase()] ?? r.name}
            </option>
          ))}
        </select>
        <span className="text-[11px] text-slate-500">{roleLabel}</span>
      </div>
      {isAdmin ? (
        <p className="mt-2 text-[11px] text-amber-800">Vai trò Quản trị không áp gói — luôn đủ quyền.</p>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(CATALOG_PERMISSION_PACKS) as CatalogPackId[]).map((id) => {
              const pack = CATALOG_PERMISSION_PACKS[id];
              const tip =
                "description" in pack && pack.description ? pack.description : pack.hint;
              return (
                <button
                  key={id}
                  type="button"
                  title={tip}
                  disabled={!previewRoleId}
                  onClick={() => apply(pack.modules, "full")}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-white"
                >
                  {pack.label} (đầy đủ)
                </button>
              );
            })}
            <button
              type="button"
              disabled={!previewRoleId}
              onClick={() => apply(ALL_CATALOG_MODULES, "view")}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              Chỉ xem mọi danh mục
            </button>
            <button
              type="button"
              disabled={!previewRoleId}
              onClick={() => apply(ALL_CATALOG_MODULES, "off")}
              className="rounded-lg border border-red-100 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100"
            >
              Tắt mọi danh mục
            </button>
          </div>
          {"description" in CATALOG_PERMISSION_PACKS.CSSD && CATALOG_PERMISSION_PACKS.CSSD.description ? (
            <p className="text-[11px] leading-snug text-slate-500">
              <span className="font-semibold text-slate-600">Master CSSD:</span>{" "}
              {CATALOG_PERMISSION_PACKS.CSSD.description}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
