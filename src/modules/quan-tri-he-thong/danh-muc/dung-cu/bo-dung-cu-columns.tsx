import type { ReactNode } from "react";
import type { Column } from "@/components/shared/AdvancedDataTable";
import type { BoDungCuTableRow } from "./bo-dung-cu-form-shared";

interface ActionCells {
  renderStatusCell: (item: BoDungCuTableRow) => ReactNode;
  renderManagementCell: (item: BoDungCuTableRow) => ReactNode;
}

function clip(s: string | null | undefined, n: number) {
  const t = String(s ?? "").trim();
  if (!t) return "—";
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

/** Định nghĩa cột bảng Bộ dụng cụ — đủ trường hiển thị so với form lưu DB. */
export function getBoDungCuColumns(actionUi: ActionCells): Column<BoDungCuTableRow>[] {
  return [
    {
      header: "MÃ BỘ",
      accessorKey: "ma_bo",
      sortable: true,
      cell: (i) => <span className="font-mono text-[11px] font-bold uppercase text-slate-700">{i.ma_bo || "—"}</span>,
    },
    {
      header: "TÊN BỘ",
      accessorKey: "ten_bo",
      sortable: true,
      cell: (i) => <span className="text-[11px] font-black uppercase text-[#026f17]">{clip(i.ten_bo, 48)}</span>,
    },
    {
      header: "PHÂN LOẠI (DC)",
      accessorKey: "loai_dung_cu",
      sortable: true,
      cell: (i) => (
        <span className="inline-flex max-w-[14rem] flex-col gap-0.5 text-[10px] font-bold text-slate-600">
          <span className="font-mono text-indigo-700">{i.loai_dung_cu?.ma_danh_muc || "—"}</span>
          <span>{clip(i.loai_dung_cu?.ten_danh_muc, 52)}</span>
        </span>
      ),
    },
    {
      header: "QUY CÁCH",
      accessorKey: "quy_cach",
      sortable: true,
      cell: (i) => <span className="text-[10px] font-bold text-slate-600">{clip(i.quy_cach, 40)}</span>,
    },
    {
      header: "KHOA SỬ DỤNG",
      accessorKey: "khoa_su_dung",
      cell: (i) => (
        <span className="inline-flex max-w-[13rem] flex-col gap-0.5 text-[10px] font-bold text-slate-600">
          <span className="font-mono text-rose-700">{i.khoa_su_dung?.ma_khoa || "—"}</span>
          <span>{clip(i.khoa_su_dung?.ten_khoa, 44)}</span>
        </span>
      ),
    },
    {
      header: "TT NGHIỆP VỤ",
      accessorKey: "trang_thai",
      sortable: true,
      cell: (i) => (
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-slate-600">
          {i.trang_thai || "—"}
        </span>
      ),
    },
    {
      header: "KIỂM KÊ GẦN NHẤT",
      accessorKey: "ngay_kiem_ke_gan_nhat",
      sortable: true,
      cell: (i) => {
        const raw = i.ngay_kiem_ke_gan_nhat;
        if (!raw) return <span className="text-[10px] text-slate-400">—</span>;
        const t = String(raw);
        return <span className="text-[10px] font-semibold text-slate-600">{t.slice(0, 10)}</span>;
      },
    },
    {
      header: "GHI CHÚ",
      accessorKey: "ghi_chu",
      cell: (i) => <span className="text-[10px] text-slate-500">{clip(i.ghi_chu, 56)}</span>,
    },
    {
      header: "HOẠT ĐỘNG",
      accessorKey: "is_active",
      sortable: true,
      cell: (i) => actionUi.renderStatusCell(i),
    },
    {
      header: "QUẢN LÝ",
      accessorKey: "id",
      cell: (i) => actionUi.renderManagementCell(i),
    },
  ];
}
