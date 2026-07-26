/** Portal SearchableSelect / SearchableMultiSelect — gắn trên panel khi mở. */
export const BV103_PICKER_PORTAL_ATTR = "data-bv103-picker-portal" as const;

export function isBv103PickerPortalTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).closest !== "function") return false;
  return Boolean((target as Element).closest(`[${BV103_PICKER_PORTAL_ATTR}]`));
}
