import {
  evaluateHeatCompatibility,
  type BomItem,
  type HeatEvaluation,
} from "@/lib/domain/cssd-packaging-rules";
import {
  isSteamSterilizerProfile,
  type SterilizerMethod,
} from "../helpers/me-tiet-khuan-machine-kind";

export const MSG_HEAT_UNKNOWN = "Không kiểm tra được chịu nhiệt — đã chặn thao tác.";
export const MSG_HEAT_STEAM_BLOCK =
  "Bộ nhạy nhiệt hoặc thiếu dữ liệu chịu nhiệt — không thêm vào mẻ máy hơi nước.";
export const MSG_HEAT_LOW_TEMP_ONLY =
  "Bộ chịu nhiệt cao — chỉ nạp máy hơi nước, không nạp máy Plasma hoặc EO.";
export const MSG_METHOD_UNKNOWN = "Không xác định được phương pháp máy — đã chặn nạp.";
export const MSG_REMOVE_AFTER_START = "Mẻ đã bắt đầu tiệt khuẩn — không bỏ bộ khỏi phiếu.";
export const MSG_REMOVE_NOT_LOADING = "Chỉ bỏ bộ khi mẻ đang nạp.";

export type BatchHeatRisk = {
  level: "OK" | "WARN" | "BLOCK";
  heat: HeatEvaluation;
  messages: string[];
};

/**
 * Đánh giá rủi ro nhiệt/Spaulding cho toàn mẻ (gộp BOM các bộ trong phiếu).
 */
export function evaluateBatchSterilizationHeatRisk(
  bomItems: BomItem[],
  machine: unknown,
): BatchHeatRisk {
  const heat = evaluateHeatCompatibility(bomItems);
  const messages: string[] = [];
  const steam = isSteamSterilizerProfile(machine);

  if (!bomItems.length) {
    return { level: "OK", heat, messages: ["Chưa có bộ trong mẻ — chưa đánh giá BOM."] };
  }

  if (heat.requireSplit) {
    messages.push(heat.reason);
    if (steam) {
      messages.push(
        "Máy đang chọn là hấp hơi nước (134°C/121°C) trong khi bộ có cấu phần nhạy nhiệt — cần tách SUB hoặc đổi phương pháp TK.",
      );
      return { level: "BLOCK", heat, messages };
    }
    return { level: "WARN", heat, messages };
  }

  if (steam && heat.recommendedMethod !== "STEAM_134") {
    messages.push(
      `Máy hấp hơi nước: BOM khuyến nghị ${heat.recommendedMethod}. ${heat.reason}`,
    );
    return { level: "WARN", heat, messages };
  }

  messages.push(heat.reason);
  return { level: "OK", heat, messages };
}

/**
 * Cổng nhiệt lúc nạp / bắt đầu mẻ.
 * Lỗi tải BOM hoặc `lines == null` → chặn (fail-closed).
 * Máy hơi nước: `is_chiu_nhiet` khác true (false, null, thiếu dòng) → chặn.
 */
export function assertSteamKitHeatAllowed(input: {
  isSteam: boolean;
  lines: Array<{ is_chiu_nhiet: boolean | null }> | null;
  loadError?: boolean;
}): { ok: true } | { ok: false; message: string } {
  if (input.loadError || input.lines == null) {
    return { ok: false, message: MSG_HEAT_UNKNOWN };
  }
  if (!input.isSteam) return { ok: true };
  const blocked = input.lines.length === 0 || input.lines.some((line) => line.is_chiu_nhiet !== true);
  if (blocked) {
    return { ok: false, message: MSG_HEAT_STEAM_BLOCK };
  }
  return { ok: true };
}

export type KitHeatLine = { is_chiu_nhiet: boolean | null };

export type KitHeatClass = "CHIU_NHIET" | "NHAY_NHIET" | "THIEU_DU_LIEU";

/**
 * Luật S1: mọi dòng `is_chiu_nhiet === true` → chịu nhiệt cao (hơi nước).
 * Có dòng false, không dòng null → nhạy nhiệt (Plasma/EO).
 * Thiếu dòng, null, hoặc lỗi tải → thiếu dữ liệu (fail closed).
 */
export function classifyKitHeat(input: {
  lines: KitHeatLine[] | null;
  loadError?: boolean;
}): KitHeatClass {
  if (input.loadError || input.lines == null || input.lines.length === 0) return "THIEU_DU_LIEU";
  if (input.lines.some((line) => line.is_chiu_nhiet == null)) return "THIEU_DU_LIEU";
  if (input.lines.every((line) => line.is_chiu_nhiet === true)) return "CHIU_NHIET";
  return "NHAY_NHIET";
}

/**
 * Cổng phương pháp trước khi hiện danh sách chờ hoặc nhận QR.
 * Hơi nước chỉ nhận bộ chịu nhiệt cao. Plasma/EO chỉ nhận bộ nhạy nhiệt.
 */
export function assertKitFitsSterilizerMethod(input: {
  method: SterilizerMethod | null;
  lines: KitHeatLine[] | null;
  loadError?: boolean;
}): { ok: true } | { ok: false; message: string } {
  const heat = classifyKitHeat(input);
  if (!input.method) return { ok: false, message: MSG_METHOD_UNKNOWN };
  if (heat === "THIEU_DU_LIEU") return { ok: false, message: MSG_HEAT_UNKNOWN };
  if (input.method === "HOI_NUOC") {
    if (heat !== "CHIU_NHIET") return { ok: false, message: MSG_HEAT_STEAM_BLOCK };
    return { ok: true };
  }
  if (heat !== "NHAY_NHIET") return { ok: false, message: MSG_HEAT_LOW_TEMP_ONLY };
  return { ok: true };
}

export function partitionWaitingKitsByMethod<T>(
  rows: T[],
  method: SterilizerMethod | null,
  heatOf: (row: T) => { lines: KitHeatLine[] | null; loadError?: boolean },
): { visible: T[]; hiddenCount: number } {
  const visible: T[] = [];
  let hiddenCount = 0;
  for (const row of rows) {
    const heat = heatOf(row);
    const gate = assertKitFitsSterilizerMethod({ method, lines: heat.lines, loadError: heat.loadError });
    if (gate.ok) visible.push(row);
    else hiddenCount += 1;
  }
  return { visible, hiddenCount };
}

/** Chỉ gỡ bộ khi phiếu còn Đang nạp (chưa Bắt đầu). */
export function rejectRemoveKitFromBatch(input: {
  tkChotNapAt?: string | null;
  trangThaiMe?: string | null;
}): string | null {
  if (input.tkChotNapAt) return MSG_REMOVE_AFTER_START;
  const state = String(input.trangThaiMe || "").trim();
  if (state && state !== "DANG_CHUAN_NAP") return MSG_REMOVE_NOT_LOADING;
  return null;
}
