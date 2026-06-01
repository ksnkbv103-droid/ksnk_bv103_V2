import type { ReactNode } from "react";
import type { Column } from "@/components/shared/AdvancedDataTable";
import type { KhoaPhongRow } from "../actions/khoa-phong.types";

interface ActionCells {
  renderStatusCell: (item: KhoaPhongRow) => ReactNode;
  renderManagementCell: (item: KhoaPhongRow) => ReactNode;
}

export function getKhoaPhongColumns(actionUi: ActionCells): Column<KhoaPhongRow>[] {
  return [
    {
      header: "MÃ KHOA",
      accessorKey: "ma_danh_muc",
      sortable: true,
      headerClassName: "w-[8rem] min-w-[8rem]",
      cellClassName: "w-[8rem] min-w-[8rem]",
      cell: (i) => (
        <span className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
          {i.ma_danh_muc}
        </span>
      ),
    },
    {
      header: "TÊN KHOA PHÒNG",
      accessorKey: "ten_danh_muc",
      sortable: true,
      headerClassName: "min-w-[12rem]",
      cellClassName: "min-w-[12rem]",
      cell: (i) => (
        <div className="font-black text-[#026f17] uppercase text-[11px] leading-tight">
          {i.ten_danh_muc}
        </div>
      ),
    },
    {
      header: "KHỐI VÀ TẢI LƯỢNG",
      accessorKey: "ten_khoi",
      headerClassName: "w-[18rem] min-w-[18rem]",
      cellClassName: "w-[18rem] min-w-[18rem]",
      cell: (i) => (
        <div className="py-1 text-[10px]">
          <div className="font-bold text-slate-700">{i.ten_khoi || "Chưa gán khối"}</div>
          <div className="text-slate-500">
            BS {i.so_bac_si || 0} và ĐD {i.so_dieu_duong || 0} - Giường {i.so_giuong_benh_thuong || 0}/{i.so_giuong_cap_cuu || 0}
          </div>
        </div>
      ),
    },
    {
      header: "TRẠNG THÁI",
      accessorKey: "is_active",
      sortable: true,
      headerClassName: "w-[8rem] min-w-[8rem]",
      cellClassName: "w-[8rem] min-w-[8rem]",
      cell: (i) => actionUi.renderStatusCell(i),
    },
    {
      header: "QUẢN LÝ",
      accessorKey: "id",
      headerClassName: "w-[8rem] min-w-[8rem]",
      cellClassName: "w-[8rem] min-w-[8rem]",
      cell: (i) => actionUi.renderManagementCell(i),
    },
  ];
}
