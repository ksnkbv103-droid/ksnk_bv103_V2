/**
 * Z-index stack cho Dialog lồng nhau (Radix portal).
 * Hub/detail dưới nested modal — khớp pattern NKBV hub (10040) + nested (10054/10055).
 */
export const BV103_DIALOG_STACK = {
  hubOverlay: "z-[10039]",
  hubContent: "z-[10040]",
  nestedOverlay: "z-[10054]",
  nestedContent: "z-[10055]",
} as const;
