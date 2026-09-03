import { bv103TypeRole } from "@/lib/bv103-design-tokens";

/**
 * 5 vai trò chữ + tối đa 3 lớp bề mặt.
 * Hook chỉ trả class đã khóa trong CSS — không set font lúc runtime
 * (Tailwind cần class tĩnh lúc build).
 */
export function useBv103Chrome() {
  return {
    type: bv103TypeRole,
    layer: {
      page: "bv103-layer-page",
      panel: "bv103-layer-panel",
      inset: "bv103-layer-inset",
    },
    actionRow: "bv103-action-row",
    stackPage: "bv103-stack-page",
    stackIn: "bv103-stack-in",
    padPanel: "bv103-pad-panel",
    padInset: "bv103-pad-inset",
  } as const;
}

export const bv103Layers = {
  page: "bv103-layer-page",
  panel: "bv103-layer-panel",
  inset: "bv103-layer-inset",
} as const;
