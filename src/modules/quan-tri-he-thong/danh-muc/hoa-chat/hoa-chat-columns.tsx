import type { ReactNode } from "react";
import type { Column } from "@/components/shared/AdvancedDataTable";
import type { HoaChatRow } from "../actions/hoa-chat.types";

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
      header: "MÃ",
      accessorKey: "ma_hoa_chat",
      sortable: true,
      cell: (i) => <span className="font-mono text-[10px] font-bold text-slate-700">{i.ma_hoa_chat || "—"}</span>,
    },
    {
      header: "TÊN",
      accessorKey: "ten_hoa_chat",
      sortable: true,
      cell: (i) => <span className="font-black uppercase text-[11px] text-[#026f17]">{clip(i.ten_hoa_chat, 40)}</span>,
    },
    {
      header: "ĐƠN VỊ",
      accessorKey: "don_vi_tinh",
      sortable: true,
      cell: (i) => <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[9px] font-black uppercase">{i.don_vi_tinh || "—"}</span>,
    },
    {
      header: "LOẠI",
      accessorKey: "loai_hoa_chat",
      sortable: true,
      cell: (i) => <span className="text-[10px] font-bold text-slate-600">{i.loai_hoa_chat || "HOA_CHAT"}</span>,
    },
    {
      header: "NỒNG ĐỘ",
      accessorKey: "nong_do",
      sortable: true,
      cell: (i) => <span className="text-[10px] font-bold text-slate-500">{i.nong_do || "—"}</span>,
    },
    {
      header: "QUY CÁCH",
      accessorKey: "quy_cach",
      sortable: true,
      cell: (i) => <span className="text-[10px] text-slate-600">{clip(i.quy_cach, 36)}</span>,
    },
    {
      header: "HẠN SD",
      accessorKey: "han_su_dung",
      sortable: true,
      cell: (i) => (
        <span className="text-[10px] font-semibold text-slate-600">
          {i.han_su_dung ? String(i.han_su_dung).slice(0, 10) : "—"}
        </span>
      ),
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
