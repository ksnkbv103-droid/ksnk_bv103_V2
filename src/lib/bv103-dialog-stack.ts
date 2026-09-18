/**
 * SSOT lớp chồng (z-index) — hộp thoại luôn trên menu trái / header / chrome trang.
 *
 * Thứ tự tăng dần: sidebar → toast → hộp thoại hub → hộp lồng → danh sách chọn → camera.
 * `surface` / `overlayDim`: nền đặc + dim — gắn cùng hub/nested class
 * để tránh bleed bảng cha qua DialogContent trong suốt.
 */
export const BV103_Z = {
  sidebarBackdrop: 65,
  sidebar: 70,
  toast: 80,
  hubOverlay: 10039,
  hubContent: 10040,
  nestedOverlay: 10054,
  nestedContent: 10055,
  pickerDropdown: 10060,
  pickerSheet: 10060,
  popover: 10070,
  camera: 10080,
} as const;

export const BV103_DIALOG_STACK = {
  sidebarBackdrop: "z-[65]",
  sidebar: "z-[70]",
  toast: "z-[80]",
  hubOverlay: "z-[10039]",
  hubContent: "z-[10040]",
  nestedOverlay: "z-[10054]",
  nestedContent: "z-[10055]",
  pickerSheet: "z-[10060]",
  camera: "z-[10080]",
  /** Nền panel đặc — luôn kèm hubContent / nestedContent. */
  surface: "border border-slate-200/90 bg-white shadow-[var(--shadow-app-soft)]",
  /** Dim overlay chuẩn (đè lên bg-black/80 mặc định của DialogOverlay). */
  overlayDim: "bg-slate-900/50",
} as const;
