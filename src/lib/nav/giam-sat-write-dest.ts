/**
 * SSOT đích nhập liệu giám sát (VST / GSC / NKBV).
 * Hub `/giam-sat` + sidebar: khi chỉ còn 1 đích ghi → deep-link / redirect bỏ click hub thừa.
 */

import {
  NAV_GATE_GSC,
  NAV_GATE_NKBV,
  NAV_GATE_VST,
  canSeeNavGate,
  type NavGate,
} from "@/lib/nav/ksnk-nav-gates";

export type GiamSatWriteDest = {
  id: "vst" | "gsc" | "nkbv";
  href: string;
  label: string;
  gate: NavGate;
};

/** Deep-link form nhập — không qua hub. */
export const GIAM_SAT_WRITE_DESTS: readonly GiamSatWriteDest[] = [
  {
    id: "vst",
    href: "/giam-sat-vst",
    label: "Vệ sinh tay (WHO)",
    gate: NAV_GATE_VST,
  },
  {
    id: "gsc",
    href: "/giam-sat-chung/tuan-thu",
    label: "Giám sát tuân thủ KSNK",
    gate: NAV_GATE_GSC,
  },
  {
    id: "nkbv",
    href: "/giam-sat-nkbv",
    label: "Giám sát NKBV",
    gate: NAV_GATE_NKBV,
  },
] as const;

export const GIAM_SAT_HUB_HREF = "/giam-sat";

export function listVisibleGiamSatWriteDests(
  isAdmin: boolean,
  canView: (module: string) => boolean,
): GiamSatWriteDest[] {
  return GIAM_SAT_WRITE_DESTS.filter((d) => canSeeNavGate(isAdmin, canView, d.gate));
}

/** Một đích ghi duy nhất → href form; nhiều / không → hub. */
export function resolveGiamSatSidebarHref(
  isAdmin: boolean,
  canView: (module: string) => boolean,
): string {
  const visible = listVisibleGiamSatWriteDests(isAdmin, canView);
  return visible.length === 1 ? visible[0].href : GIAM_SAT_HUB_HREF;
}

/** mode=write + đúng 1 đích → skip hub. */
export function pickSoleWriteHrefForMode(
  mode: string | null | undefined,
  visibleWriteHrefs: readonly string[],
): string | null {
  if (mode !== "write") return null;
  return visibleWriteHrefs.length === 1 ? visibleWriteHrefs[0] : null;
}

/** Active sidebar «Giám sát» trên hub hoặc deep-link module. */
export function isGiamSatNavPath(pathname: string): boolean {
  return (
    pathname === GIAM_SAT_HUB_HREF ||
    pathname.startsWith("/giam-sat-vst") ||
    pathname.startsWith("/giam-sat-chung") ||
    pathname.startsWith("/giam-sat-nkbv") ||
    pathname.startsWith("/lich-su/vst") ||
    pathname.startsWith("/lich-su/gsc") ||
    pathname === "/qr"
  );
}
