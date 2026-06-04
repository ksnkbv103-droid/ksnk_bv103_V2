import type { CSSProperties } from "react";
import {
  getQlcvWorkflowGate,
  getQlcvWorkflowGateBadgeClass,
  type CongViecLike,
  type QlcvWorkflowGate,
} from "./qlcv-workflow-display";

/** Mã trạng thái DM dùng tra `mau_sac` cho từng cổng UX. */
const GATE_MAU_SAC_MA: Record<QlcvWorkflowGate, string> = {
  DE_XUAT: "MOI",
  NGHIEM_THU: "CHO_DUYET",
  DANG_LAM: "DANG_LAM",
  MOI: "MOI",
  HOAN_THANH: "HOAN_THANH",
  QUA_HAN: "QUA_HAN",
  DA_HUY: "DA_HUY",
  TU_CHOI: "TU_CHOI",
};

const BADGE_BASE_CLASS =
  "inline-block rounded-full border px-2.5 py-1 text-[11px] font-medium normal-case";

function normalizeHex(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t.toUpperCase();
  if (/^[0-9A-Fa-f]{6}$/.test(t)) return `#${t.toUpperCase()}`;
  return null;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const n = normalizeHex(hex);
  if (!n) return null;
  const v = n.slice(1);
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  if ([r, g, b].some((x) => Number.isNaN(x))) return null;
  return { r, g, b };
}

export function pillStyleFromMauSac(mauSac: string): CSSProperties | undefined {
  const rgb = hexToRgb(mauSac);
  if (!rgb) return undefined;
  const { r, g, b } = rgb;
  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.12)`,
    borderColor: `rgba(${r}, ${g}, ${b}, 0.35)`,
    color: `rgb(${Math.round(r * 0.55)}, ${Math.round(g * 0.55)}, ${Math.round(b * 0.55)})`,
  };
}

export type QlcvWorkflowBadgeAppearance = {
  className: string;
  style?: CSSProperties;
};

/** Badge cổng workflow — ưu tiên `mau_sac` MDM, fallback Tailwind cứng. */
export function resolveQlcvWorkflowBadgeAppearance(
  task: CongViecLike,
  mauSacByMa?: Record<string, string | null | undefined>,
): QlcvWorkflowBadgeAppearance {
  const gate = getQlcvWorkflowGate(task);
  const ma = GATE_MAU_SAC_MA[gate];
  const mauSac = mauSacByMa?.[ma]?.trim();
  const style = mauSac ? pillStyleFromMauSac(mauSac) : undefined;
  if (style) {
    return { className: BADGE_BASE_CLASS, style };
  }
  return {
    className: `${BADGE_BASE_CLASS} ${getQlcvWorkflowGateBadgeClass(task)}`,
  };
}
