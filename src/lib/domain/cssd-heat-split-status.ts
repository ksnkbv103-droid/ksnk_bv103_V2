/** Trạng thái tách SUB khi bộ lẫn chịu nhiệt / không chịu nhiệt. */

export type HeatSplitStatus = "NOT_REQUIRED" | "NONE" | "DONE";

export function resolveHeatSplitStatus(args: {
  requireSplit: boolean;
  maVaiTroBo?: string | null;
  hasActiveSub: boolean;
}): HeatSplitStatus {
  if (!args.requireSplit) return "NOT_REQUIRED";
  const vai = String(args.maVaiTroBo || "").trim().toUpperCase();
  if (args.hasActiveSub || vai === "MAIN" || vai === "SUB") return "DONE";
  return "NONE";
}

export function packConfirmBlockedByHeatSplit(status: HeatSplitStatus): {
  blocked: boolean;
  reason?: string;
} {
  if (status !== "NONE") return { blocked: false };
  return {
    blocked: true,
    reason: "Cần tách cấu phần nhạy cảm nhiệt sang túi phụ (SUB) trước khi xác nhận đóng gói.",
  };
}
