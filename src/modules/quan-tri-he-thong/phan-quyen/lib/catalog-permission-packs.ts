/** Gói quyền danh mục — QT-E. Chỉ đụng ô ma trận; không đổi RLS. */

export const CATALOG_PACK_FULL_ACTIONS = ["view", "create", "edit", "delete", "import"] as const;

export const CATALOG_PERMISSION_PACKS = {
  TO_CHUC: {
    label: "Tổ chức",
    hint: "Khoa, nhân sự, lookup tổ chức",
    modules: ["KHOA_PHONG", "NHAN_SU", "DANH_MUC_ORG", "DANH_MUC"],
  },
  BANG_KIEM: {
    label: "Bảng kiểm",
    hint: "Mẫu bảng kiểm, tiêu chí, lookup giám sát",
    modules: ["BANG_KIEM", "BANG_KIEM_DETAIL", "DANH_MUC_GSTT", "DANH_MUC"],
  },
  CSSD: {
    label: "Master CSSD",
    hint: "Loại, bộ, chi tiết, máy, hóa chất, lookup CSSD. Hard-write master loại/bộ/BOM chỉ ADMIN; BO_DC.edit = duyệt phiếu (D5).",
    description:
      "Hard-write master loại/bộ/BOM chỉ ADMIN; BO_DC.edit = duyệt phiếu (D5). Gói đầy đủ bật ô ma trận danh mục — không mở form MDM cho non-ADMIN.",
    modules: ["LOAI_DC", "BO_DC", "DC_LE", "THIET_BI", "HOA_CHAT", "DANH_MUC_CSSD_LOOKUP", "DANH_MUC"],
  },
} as const;

export type CatalogPackId = keyof typeof CATALOG_PERMISSION_PACKS;

export const ALL_CATALOG_MODULES: readonly string[] = [
  ...new Set(Object.values(CATALOG_PERMISSION_PACKS).flatMap((p) => [...p.modules])),
];

type Perm = { id: string; module_name: string; action: string };

function normMod(s: string) {
  return String(s || "").trim().toUpperCase();
}
function normAct(s: string) {
  return String(s || "").trim().toLowerCase();
}

export function catalogPermissionIds(
  permissions: Perm[],
  modules: readonly string[],
  actions: readonly string[],
): string[] {
  const modSet = new Set(modules.map(normMod));
  const actSet = new Set(actions.map(normAct));
  return permissions
    .filter((p) => modSet.has(normMod(p.module_name)) && actSet.has(normAct(p.action)))
    .map((p) => p.id);
}

export function applyCatalogPackToSet(
  current: Set<string>,
  permissions: Perm[],
  packModules: readonly string[],
  mode: "full" | "view" | "off",
): Set<string> {
  const writeIds = catalogPermissionIds(permissions, packModules, CATALOG_PACK_FULL_ACTIONS);
  const viewIds = catalogPermissionIds(permissions, packModules, ["view"]);
  const next = new Set(current);
  for (const id of writeIds) next.delete(id);
  if (mode === "off") return next;
  const add = mode === "full" ? writeIds : viewIds;
  for (const id of add) next.add(id);
  return next;
}
