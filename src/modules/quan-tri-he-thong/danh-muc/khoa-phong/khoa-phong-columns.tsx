import type { ReactNode } from "react";
import type { Column } from "@/components/shared/AdvancedDataTable";
import InlineEntityQrThumb from "@/components/shared/InlineEntityQrThumb";
import type { KhoaPhongRow } from "../actions/khoa-phong.types";
import { quanTriTableChrome as TC, quanTriTableHeaders as TH } from "../../lib/quan-tri-table-chrome";
import LocationQrPrintButton from "@/components/shared/LocationQrPrintButton";
import { buildLocationQrCode } from "@/lib/entity-qr/entity-qr-core";

interface ActionCells {
  renderStatusCell: (item: KhoaPhongRow) => ReactNode;
  renderManagementCell: (item: KhoaPhongRow) => ReactNode;
}

export function getKhoaPhongColumns(actionUi: ActionCells): Column<KhoaPhongRow>[] {
  return [
    {
      header: "Mã khoa / QR",
      accessorKey: "ma_danh_muc",
      sortable: true,
      headerClassName: "w-[10rem] min-w-[10rem]",
      cellClassName: "w-[10rem] min-w-[10rem]",
      cell: (i) => {
        const locCode = buildLocationQrCode("LOC_KHOA", String(i.ma_danh_muc || ""));
        return (
          <span className="inline-flex items-center gap-2">
            {locCode ? <InlineEntityQrThumb code={locCode} size={32} /> : null}
            <span className={`${TC.cellCode} rounded-md border border-slate-100 bg-slate-50 px-2 py-1 text-slate-500`}>
              {i.ma_danh_muc}
            </span>
          </span>
        );
      },
    },
    {
      header: "Tên khoa phòng",
      accessorKey: "ten_danh_muc",
      sortable: true,
      headerClassName: "min-w-[12rem]",
      cellClassName: "min-w-[12rem]",
      cell: (i) => (
        <div className={`${TC.cellTitle} text-[11px] leading-tight`}>
          {i.ten_danh_muc}
        </div>
      ),
    },
    {
      header: "Khối và tải lượng",
      accessorKey: "ten_khoi",
      headerClassName: "w-[18rem] min-w-[18rem]",
      cellClassName: "w-[18rem] min-w-[18rem]",
      cell: (i) => (
        <div className="py-1 text-[11px]">
          <div className="font-semibold text-slate-700">{i.ten_khoi || "Chưa gán khối"}</div>
          <div className="text-slate-500">
            BS {i.so_bac_si || 0} và ĐD {i.so_dieu_duong || 0} - Giường {i.so_giuong_benh_thuong || 0}/{i.so_giuong_cap_cuu || 0}
          </div>
        </div>
      ),
    },
    {
      header: TH.status,
      accessorKey: "is_active",
      sortable: true,
      headerClassName: "w-[8rem] min-w-[8rem]",
      cellClassName: "w-[8rem] min-w-[8rem]",
      cell: (i) => actionUi.renderStatusCell(i),
    },
    {
      header: TH.manage,
      accessorKey: "id",
      headerClassName: "w-[11rem] min-w-[11rem]",
      cellClassName: "w-[11rem] min-w-[11rem]",
      cell: (i) => (
        <div className="flex flex-wrap items-center gap-1">
          <LocationQrPrintButton
            kind="LOC_KHOA"
            ma={String(i.ma_danh_muc || "")}
            ten={String(i.ten_danh_muc || "")}
          />
          {actionUi.renderManagementCell(i)}
        </div>
      ),
    },
  ];
}
