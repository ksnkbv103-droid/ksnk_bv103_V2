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
  /** Một viền quanh sổ — không bọc thêm khối trắng bên ngoài. */
  frame: "bv103-layer-panel",
  th: "min-w-0 px-[var(--bv103-space-3)] py-[var(--bv103-space-2)] text-left",
  td: "min-w-0 px-[var(--bv103-space-3)] py-[var(--bv103-space-2)] align-top",
  theadRow: "sticky top-0 z-[1] border-b border-slate-200 bg-slate-50 shadow-[0_1px_0_rgb(226_232_240)]",
  tbody: "divide-y divide-slate-100 bg-white",
  row: "hover:bg-slate-50 even:bg-slate-50/40",
  rowSelected: "bg-[var(--primary)]/8",
  /** Trạng thái trong ô sổ — chữ màu, không viên thuốc. */
  statusOk: "bv103-type-label text-emerald-800",
  statusWarn: "bv103-type-label text-amber-800",
  statusDanger: "bv103-type-label text-red-700",
  statusMuted: "bv103-type-label text-slate-500",
  statusInfo: "bv103-type-label text-slate-700",

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
