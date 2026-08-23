/**
 * Nhãn nguồn giám sát trên màn hình / bản in.
 * Không đổi mã RPC (`vol_tgs`, `vol_ksnk`) hay công thức tỷ lệ.
 */

export const SUPERVISION_SOURCE_UI = {
  tgs: "Tự giám sát",
  ksnk: "Chuyên trách",
  tgsPct: "Tự GS %",
  ksnkPct: "Chuyên trách %",
  tgsVolShort: "Tự GS",
  ksnkVolShort: "Chuyên trách",
  vstTgsVol: "Cơ hội tự giám sát",
  vstKsnkVol: "Cơ hội chuyên trách",
  gscTgsVol: "Khảo sát tự giám sát",
  gscKsnkVol: "Khảo sát chuyên trách",
} as const;

const EXCLUSION_UI: Record<string, string> = {
  "Chưa triển khai": "Chưa triển khai",
  "Chưa TGS": "Chưa tự giám sát",
  "Chưa KSNK": "Chưa chuyên trách",
};

export function labelGapExclusion(reason: string | null | undefined): string {
  if (!reason) return "—";
  return EXCLUSION_UI[reason] ?? reason;
}
