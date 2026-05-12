import type { ReactNode } from "react";
import type { Column } from "@/components/shared/AdvancedDataTable";
import type { DungCuChiTietTableRow } from "./dung-cu-chi-tiet-form-shared";

interface ActionCells {
  renderStatusCell: (item: DungCuChiTietTableRow) => ReactNode;
  renderManagementCell: (item: DungCuChiTietTableRow) => ReactNode;
}

function clip(s: string | null | undefined, n: number) {
  const t = String(s ?? "").trim();
  if (!t) return "—";
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

export function getDungCuChiTietColumns(actionUi: ActionCells): Column<DungCuChiTietTableRow>[] {
  return [
    {
      header: "MÃ CHI TIẾT",
      accessorKey: "ma_chi_tiet",
      sortable: true,
      cell: (i) => <span className="font-mono text-[10px] font-bold text-indigo-700">{i.ma_chi_tiet || "—"}</span>,
    },
    {
      header: "TÊN",
      accessorKey: "ten_chi_tiet",
      sortable: true,
      cell: (i) => (
        <span className="text-[11px] font-black uppercase text-[#026f17]">{clip(i.ten_chi_tiet || i.ten_dung_cu_le, 42)}</span>
      ),
    },
    {
      header: "MÃ LOẠI",
      accessorKey: "ma_loai",
      sortable: true,
      cell: (i) => (
        <span className="text-[10px] font-mono font-bold text-violet-700">
          {String((i as Record<string, unknown>).ma_loai || i.loai_dung_cu?.ma_danh_muc || "—")}
        </span>
      ),
    },
    {
      header: "LOẠI DC",
      accessorKey: "loai_dung_cu",
      sortable: true,
      cell: (i) => (
        <span className="text-[10px] font-bold text-slate-600">
          {i.loai_dung_cu?.ma_danh_muc || "—"}
          {i.loai_dung_cu?.ten_danh_muc ? ` — ${clip(i.loai_dung_cu.ten_danh_muc, 36)}` : ""}
        </span>
      ),
    },
    {
      header: "BỘ",
      accessorKey: "bo_dung_cu_id",
      sortable: true,
      cell: (i) => (
        <span className="text-[10px] font-bold text-blue-700">
          {i.bo_dung_cu?.ma_bo ? `${i.bo_dung_cu.ma_bo} · ` : ""}
          {clip(i.bo_dung_cu?.ten_bo, 32) || "Dụng cụ lẻ"}
        </span>
      ),
    },
    {
      header: "SL",
      accessorKey: "so_luong",
      sortable: true,
      cell: (i) => <span className="text-[10px] font-bold">{i.so_luong ?? "—"}</span>,
    },
    {
      header: "CK TỐI ĐA",
      accessorKey: "max_suds_count",
      sortable: true,
      cell: (i) => <span className="text-[10px]">{i.max_suds_count ?? "—"}</span>,
    },
    {
      header: "TRỌNG LƯỢNG",
      accessorKey: "trong_luong",
      sortable: true,
      cell: (i) => (
        <span className="text-[10px]">{i.trong_luong != null && i.trong_luong !== "" ? String(i.trong_luong) : "—"}</span>
      ),
    },
    {
      header: "QR MẪU",
      accessorKey: "ma_qr_mau",
      cell: (i) => <span className="text-[9px] text-slate-500">{clip(i.ma_qr_mau, 28)}</span>,
    },
    {
      header: "GHI CHÚ",
      accessorKey: "ghi_chu",
      cell: (i) => <span className="text-[10px] text-slate-500">{clip(i.ghi_chu, 40)}</span>,
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
