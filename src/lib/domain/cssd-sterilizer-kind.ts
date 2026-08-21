/** Phân loại máy CSSD theo mã lookup `LM_*` — không đoán từ tên máy. */

export type CssdSterilizerKind = "STEAM" | "PLASMA" | "EO";

export const WASHER_LOAI_MAY = ["LM_RUA_TU_DONG", "LM_RUA_SIEU_AM"] as const;

export function normalizeLoaiMayCode(raw: unknown): string {
  return String(raw || "")
    .trim()
    .toUpperCase();
}

export function isWasherLoaiMay(maLoaiMay: unknown): boolean {
  const ma = normalizeLoaiMayCode(maLoaiMay);
  return (WASHER_LOAI_MAY as readonly string[]).includes(ma);
}

function nestedLoaiMayCode(machine: unknown): string {
  if (!machine || typeof machine !== "object") return "";
  const m = Array.isArray(machine) ? machine[0] : machine;
  if (!m || typeof m !== "object") return "";
  const rec = m as Record<string, unknown>;
  const direct = normalizeLoaiMayCode(rec.ma_loai_may);
  if (direct.startsWith("LM_")) return direct;
  const nested = rec.loai_may;
  const lm = Array.isArray(nested) ? nested[0] : nested;
  if (lm && typeof lm === "object") {
    const code = normalizeLoaiMayCode((lm as { ma_loai_may?: unknown }).ma_loai_may);
    if (code.startsWith("LM_")) return code;
  }
  return "";
}

/**
 * Ưu tiên `ma_loai_may` / `loai_may.ma_loai_may`. Fallback tên chỉ khi chưa có mã lookup.
 */
export function classifySterilizerKind(machine: unknown): CssdSterilizerKind {
  const ma = nestedLoaiMayCode(machine);
  if (ma === "LM_HOI_NUOC") return "STEAM";
  if (ma === "LM_PLASMA") return "PLASMA";
  if (ma === "LM_EO") return "EO";

  const rec =
    machine && typeof machine === "object"
      ? ((Array.isArray(machine) ? machine[0] : machine) as Record<string, unknown>)
      : {};
  const blob = [
    rec?.loai_ten_hien_thi,
    rec?.loai_thiet_bi,
    rec?.ten_thiet_bi,
    rec?.ten_loai_may,
    ma,
  ]
    .map((x) => String(x || ""))
    .join(" ")
    .toLowerCase();
  if (/eo|ethylen|oxit|oxide/.test(blob)) return "EO";
  if (/plasma|h2o2|hydro/.test(blob)) return "PLASMA";
  return "STEAM";
}

export function isSteamSterilizerKind(machine: unknown): boolean {
  return classifySterilizerKind(machine) === "STEAM";
}
