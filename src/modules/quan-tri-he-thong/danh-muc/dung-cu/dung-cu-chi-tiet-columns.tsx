import type { ReactNode } from "react";
import type { Column } from "@/components/shared/AdvancedDataTable";
import type { DungCuChiTietTableRow } from "./dung-cu-chi-tiet-form-shared";
import { quanTriTableChrome as TC, quanTriTableHeaders as TH } from "../../lib/quan-tri-table-chrome";

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
      header: "Mã chi tiết",
      accessorKey: "ma_chi_tiet",
      sortable: true,
      cell: (i) => <span className={`${TC.cellCode} text-indigo-700`}>{i.ma_chi_tiet || "—"}</span>,
    },
    {
      header: "Tên",
      accessorKey: "ten_chi_tiet",
      sortable: true,
      cell: (i) => (
        <span className={TC.cellTitle}>{clip(i.ten_chi_tiet || i.ten_dung_cu_le, 42)}</span>
      ),
    },
    {
      header: "Mã loại",
      accessorKey: "ma_loai",
      sortable: true,
      cell: (i) => (
        <span className={`${TC.cellCode} text-violet-700`}>
          {String((i as Record<string, unknown>).ma_loai || i.loai_dung_cu?.ma_danh_muc || "—")}
        </span>
      ),
    },
    {
      header: "Loại dc",
      accessorKey: "loai_dung_cu",
      sortable: true,
      cell: (i) => (
        <span className={TC.cellMeta}>
          {i.loai_dung_cu?.ma_danh_muc || "—"}
          {i.loai_dung_cu?.ten_danh_muc ? ` — ${clip(i.loai_dung_cu.ten_danh_muc, 36)}` : ""}
        </span>
      ),
    },
    {
      header: "Bộ",
      accessorKey: "bo_dung_cu_id",
      sortable: true,
      cell: (i) => (
        <span className={`${TC.cellMeta} text-blue-700`}>
          {i.bo_dung_cu?.ma_bo ? `${i.bo_dung_cu.ma_bo} · ` : ""}
          {clip(i.bo_dung_cu?.ten_bo, 32) || "Dụng cụ lẻ"}
        </span>
      ),
    },
    {
      header: "Sl",
      accessorKey: "so_luong",
      sortable: true,
      cell: (i) => <span className={`${TC.cellIndex} tabular-nums`}>{i.so_luong ?? "—"}</span>,
    },
    {
      header: "Ck tối đa",
      accessorKey: "max_suds_count",
      sortable: true,
      cell: (i) => <span className="text-[11px]">{i.max_suds_count ?? "—"}</span>,
    },
    {
      header: "Trọng lượng",
      accessorKey: "trong_luong",
      sortable: true,
      cell: (i) => (
        <span className="text-[11px]">{i.trong_luong != null && i.trong_luong !== "" ? String(i.trong_luong) : "—"}</span>
      ),
    },
    {
      header: "Qr mẫu",
      accessorKey: "ma_qr_mau",
      cell: (i) => <span className="text-[11px] text-slate-500">{clip(i.ma_qr_mau, 28)}</span>,
    },
    {
      header: "Ghi chú",
      accessorKey: "ghi_chu",
      cell: (i) => <span className="text-[11px] text-slate-500">{clip(i.ghi_chu, 40)}</span>,
    },
    {
      header: TH.status,
      accessorKey: "is_active",
      sortable: true,
      cell: (i) => actionUi.renderStatusCell(i),
    },
    {
      header: TH.manage,
      accessorKey: "id",
      cell: (i) => actionUi.renderManagementCell(i),
    },
  ];
}
