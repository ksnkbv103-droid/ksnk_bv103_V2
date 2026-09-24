import {
  evaluateHeatCompatibility,
  type BomItem,
  type HeatEvaluation,
} from "@/lib/domain/cssd-packaging-rules";
import { isSteamSterilizerProfile } from "../helpers/me-tiet-khuan-machine-kind";

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
    return { ok: false, message: "Không kiểm tra được chịu nhiệt — đã chặn thao tác." };
  }
  if (!input.isSteam) return { ok: true };
  const blocked = input.lines.length === 0 || input.lines.some((line) => line.is_chiu_nhiet !== true);
  if (blocked) {
    return {
      ok: false,
      message: "Bộ nhạy nhiệt hoặc thiếu dữ liệu chịu nhiệt — không thêm vào mẻ máy hơi nước.",
    };
  }
  return { ok: true };
}
