import type { ReactNode } from "react";
import type { Column } from "@/components/shared/AdvancedDataTable";
import type { HoaChatRow } from "../actions/hoa-chat.types";
import { quanTriTableChrome as TC, quanTriTableHeaders as TH } from "../../lib/quan-tri-table-chrome";

interface ActionCells {
  renderStatusCell: (item: HoaChatRow) => ReactNode;
  renderManagementCell: (item: HoaChatRow) => ReactNode;
}

function clip(s: string | null | undefined, n: number) {
  const t = String(s ?? "").trim();
  if (!t) return "—";
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

export function getHoaChatColumns(actionUi: ActionCells): Column<HoaChatRow>[] {
  return [
    {
      header: "Mã",
      accessorKey: "ma_hoa_chat",
      sortable: true,
      cell: (i) => <span className={`${TC.cellCode} text-slate-700`}>{i.ma_hoa_chat || "—"}</span>,
    },
    {
      header: "Tên",
      accessorKey: "ten_hoa_chat",
      sortable: true,
      cell: (i) => <span className={TC.cellTitle}>{clip(i.ten_hoa_chat, 40)}</span>,
    },
    {
      header: "Đơn vị",
      accessorKey: "don_vi_tinh",
      sortable: true,
      cell: (i) => <span className="rounded-full bg-[var(--surface-warning-bg)] px-3 py-1 text-[11px] font-medium text-[var(--surface-warning-text)]">{i.don_vi_tinh || "—"}</span>,
    },
    {
      header: "Loại",
      accessorKey: "loai_hoa_chat",
      sortable: true,
      cell: (i) => <span className={TC.cellMeta}>{i.loai_hoa_chat || "HOA_CHAT"}</span>,
    },
    {
      header: "Nồng độ",
      accessorKey: "nong_do",
      sortable: true,
      cell: (i) => <span className="text-[11px] text-[11px] font-medium text-slate-500">{i.nong_do || "—"}</span>,
    },
    {
      header: "Quy cách",
      accessorKey: "quy_cach",
      sortable: true,
      cell: (i) => <span className="text-[11px] text-slate-600">{clip(i.quy_cach, 36)}</span>,
    },
    {
      header: "Hạn sd",
      accessorKey: "han_su_dung",
      sortable: true,
      cell: (i) => (
        <span className="text-[11px] font-semibold text-slate-600">
          {i.han_su_dung ? String(i.han_su_dung).slice(0, 10) : "—"}
        </span>
      ),
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
