import type { SterilizerMethod } from "../helpers/me-tiet-khuan-machine-kind";

export type DesignatedSterileMethod = "STEAM_134" | "STEAM_121" | "PLASMA" | "EO";

export type KitDesignatedLine = {
  phuong_phap_tiet_khuan_chi_dinh?: string | null;
};

export const MSG_PP_PLASMA_EO_CROSS =
  "PP chỉ định bộ không khớp máy (Plasma/EO) — không thêm vào mẻ.";
export const MSG_PP_STEAM_ON_LOW_TEMP =
  "Bộ chỉ định hơi nước — không nạp máy Plasma hoặc EO.";
export const MSG_PP_STEAM_CYCLE =
  "PP chỉ định bộ không khớp chu trình hơi nước (121°C/134°C) — không thêm vào mẻ.";
export const MSG_PP_MISSING_WARN =
  "Thiếu PP chỉ định trên một số loại dụng cụ — kiểm tra danh mục trước khi nạp.";

export function normalizeDesignatedPp(raw: unknown): DesignatedSterileMethod | null {
  const v = String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/-/g, "_");
  if (!v) return null;
  if (v === "STEAM_134" || v === "134") return "STEAM_134";
  if (v === "STEAM_121" || v === "121") return "STEAM_121";
  if (v === "PLASMA" || v === "PLASMA_H2O2") return "PLASMA";
  if (v === "EO") return "EO";
  return null;
}

/** Suy chu trình hơi nước từ mã/tên chương trình mẻ (khi đã chọn). */
export function inferSteamCycleFromChuongTrinh(input: {
  chuongTrinhMa?: string | null;
  chuongTrinhTen?: string | null;
}): "STEAM_121" | "STEAM_134" | null {
  const ma = String(input.chuongTrinhMa ?? "")
    .trim()
    .toUpperCase();
  const ten = String(input.chuongTrinhTen ?? "")
    .trim()
    .toUpperCase();
  const blob = `${ma} ${ten}`;
  if (!blob.trim()) return null;
  if (/\b121\b|HN_121|STEAM_121/.test(blob)) return "STEAM_121";
  if (/\b134\b|HN_134|STEAM_134/.test(blob)) return "STEAM_134";
  return null;
}

function lowTempFamily(method: DesignatedSterileMethod): "PLASMA" | "EO" | null {
  if (method === "PLASMA") return "PLASMA";
  if (method === "EO") return "EO";
  return null;
}

/**
 * CSSD-10: đối chiếu PP chỉ định danh mục với PP máy / chu trình hơi nước.
 * Thiếu PP → cảnh báo (ok), không chặn. PP rõ mà lệch → chặn.
 */
export function evaluatePpChiDinhGate(input: {
  method: SterilizerMethod;
  lines: KitDesignatedLine[];
  steamCycle?: "STEAM_121" | "STEAM_134" | null;
}):
  | { ok: true; warnings: string[] }
  | { ok: false; message: string } {
  const warnings: string[] = [];
  let missing = 0;
  for (const line of input.lines) {
    const pp = normalizeDesignatedPp(line.phuong_phap_tiet_khuan_chi_dinh);
    if (!pp) {
      missing += 1;
      continue;
    }
    if (input.method === "HOI_NUOC") {
      const low = lowTempFamily(pp);
      if (low) return { ok: false, message: MSG_PP_STEAM_ON_LOW_TEMP };
      if (input.steamCycle && pp !== input.steamCycle) {
        return { ok: false, message: MSG_PP_STEAM_CYCLE };
      }
      continue;
    }
    if (input.method === "PLASMA_H2O2") {
      if (pp === "EO") return { ok: false, message: MSG_PP_PLASMA_EO_CROSS };
      if (pp === "STEAM_121" || pp === "STEAM_134") {
        return { ok: false, message: MSG_PP_STEAM_ON_LOW_TEMP };
      }
      continue;
    }
    if (input.method === "EO") {
      if (pp === "PLASMA") return { ok: false, message: MSG_PP_PLASMA_EO_CROSS };
      if (pp === "STEAM_121" || pp === "STEAM_134") {
        return { ok: false, message: MSG_PP_STEAM_ON_LOW_TEMP };
      }
    }
  }
  if (missing > 0) warnings.push(MSG_PP_MISSING_WARN);
  return { ok: true, warnings };
}
