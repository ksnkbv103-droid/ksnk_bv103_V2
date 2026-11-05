/** Portal SearchableSelect / SearchableMultiSelect — gắn trên panel khi mở. */
export const BV103_PICKER_PORTAL_ATTR = "data-bv103-picker-portal" as const;

export function isBv103PickerPortalTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).closest !== "function") return false;
  return Boolean((target as Element).closest(`[${BV103_PICKER_PORTAL_ATTR}]`));
}

/** Có panel picker đang mở (Esc nên đóng picker trước, không đóng Dialog bên dưới). */
export function isBv103PickerPortalOpen(): boolean {
  if (typeof document === "undefined") return false;
  return document.querySelector(`[${BV103_PICKER_PORTAL_ATTR}]`) !== null;
}

/**
 * Gắn panel cạnh overlay Dialog (cùng portal Radix) — không bị `aria-hidden`/`inert`,
 * và `position: fixed` vẫn theo viewport (không nằm trong khối `transform` của content).
 */
export function resolveBv103PickerPortalRoot(): HTMLElement {
  if (typeof document === "undefined") {
    throw new Error("resolveBv103PickerPortalRoot chỉ chạy trên trình duyệt.");
  }
  const dialogs = document.querySelectorAll(
    "[data-radix-dialog-content][data-state='open'], [role='dialog'][data-state='open'], [role='alertdialog'][data-state='open']"
  );
  const topDialog = dialogs.length > 0 ? dialogs[dialogs.length - 1] : null;
  const host = topDialog?.parentElement;
  if (host instanceof HTMLElement) return host;
  return document.body;
}

/**
 * Dialog modal đánh `aria-hidden` / `inert` lên sibling trên `document.body`.
 * Ô tìm portal ra body sẽ không nhận phím — gỡ cờ đó trên panel picker.
 */
export function unlockBv103PickerPortalKeyboard(root: HTMLElement | null): () => void {
  if (!root) return () => {};

  const clear = () => {
    if (root.getAttribute("aria-hidden") === "true") root.removeAttribute("aria-hidden");
    if (root.hasAttribute("inert")) root.removeAttribute("inert");
    const inertEl = root as HTMLElement & { inert?: boolean };
    if (inertEl.inert) inertEl.inert = false;
  };

  clear();
  if (typeof MutationObserver === "undefined") return () => {};
  const obs = new MutationObserver(clear);
  obs.observe(root, { attributes: true, attributeFilter: ["aria-hidden", "inert"] });
  return () => obs.disconnect();
}
