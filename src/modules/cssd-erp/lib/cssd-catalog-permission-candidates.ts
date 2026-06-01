/** Permission keys tried (in order) for CSSD kho / catalog read — SSOT for tests and actions. */
export const CSSD_KHO_CATALOG_PERMISSION_CANDIDATES: ReadonlyArray<readonly [string, string]> = [
  ["CSSD_KHO_DUNGCU", "view"],
  ["CSSD_KHO_DUNGCU", "edit"],
  ["CSSD_KHO_DUNGCU", "create"],
  ["CSSD_KHO_DUNGCU", "import"],
  ["CSSD_WORKFLOW", "view"],
] as const;
