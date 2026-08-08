/**
 * SSOT tỉ lệ cột bảng vận hành / danh mục — dùng với AdvancedDataTable
 * `headerClassName` / `cellClassName`.
 *
 * `AdvancedDataTable` luôn giữ `w-full` — caller có thể truyền chỉ `"table-fixed"`
 * hoặc dùng `tableFixed` bên dưới.
 *
 * Quy ước: cột thao tác luôn cuối; mã/QR hẹp cố định; tên (`colTitle`) hút chiều ngang thừa.
 */
export const bv103TableLayout = {
  /** Class bảng cố định tỉ lệ — tràn khung (w-full đã có trong AdvancedDataTable; giữ đủ cho call site cũ). */
  tableFixed: "w-full min-w-[640px] table-fixed border-collapse text-left",

  /** Mã + QR thumb */
  colCodeQr: "w-[9.5rem] min-w-[8.5rem]",
  /** Tên / tiêu đề chính — giãn hết phần còn lại */
  colTitle: "w-auto min-w-[10rem]",
  /** Badge trạng thái / PM */
  colStatus: "w-[8rem] min-w-[7rem]",
  /** Meta ngắn (vị trí, serial…) */
  colMeta: "w-[7.5rem] min-w-[6rem]",
  /** Số hẹp (STT, đếm) */
  colNarrow: "w-[4.5rem] min-w-[3.5rem] text-center",
  /** Cột thao tác 1 nút — luôn cuối hàng, căn phải */
  colActions: "w-[6.5rem] min-w-[5.5rem] text-right",
  /** Cột thao tác nhiều nút (Xem / Sửa / In) */
  colActionsWide: "w-[11rem] min-w-[9rem] text-right",
  /** Ô nút trong cột thao tác */
  actionsCell: "flex flex-wrap items-center justify-end gap-1.5",
} as const;
